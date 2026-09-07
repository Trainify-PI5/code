package com.trainify.lms.services;

import com.trainify.lms.domain.entities.*;
import com.trainify.lms.domain.entities.Module;
import com.trainify.lms.domain.enums.CourseStatus;
import com.trainify.lms.dto.*;
import com.trainify.lms.repositories.CourseRepository;
import com.trainify.lms.repositories.LessonRepository;
import com.trainify.lms.repositories.MediaAssetRepository;
import com.trainify.lms.repositories.ModuleRepository;
import com.trainify.lms.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityNotFoundException;
import com.trainify.lms.security.CustomUserDetails;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CourseService {

    private final CourseRepository courseRepository;
    private final ModuleRepository moduleRepository;
    private final LessonRepository lessonRepository;
    private final MediaAssetRepository mediaAssetRepository;
    private final UserRepository userRepository;

    private CustomUserDetails getCurrentUser() {
        return (CustomUserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }

    private void checkInstructorAccess(Course course) {
        CustomUserDetails currentUser = getCurrentUser();
        boolean isAdmin = currentUser.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ROLE_MANAGER"));
        
        if (!isAdmin && !course.getInstructor().getId().equals(currentUser.getId())) {
            throw new org.springframework.security.access.AccessDeniedException("User is not the instructor of this course");
        }
    }

    @Transactional(readOnly = true)
    @Cacheable(value = "courses", key = "#tenantId")
    public List<CourseDto> getPublishedCourses(UUID tenantId) {
        return courseRepository.findAll().stream()
                .filter(c -> c.getStatus() == CourseStatus.PUBLISHED && c.getTenant().getId().equals(tenantId))
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<CourseDto> getAllCoursesByTenant(UUID tenantId) {
        return courseRepository.findAll().stream()
                .filter(c -> c.getTenant().getId().equals(tenantId))
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public CourseDto getCourseById(UUID id) {
        Course course = courseRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Course not found"));
        return mapToDto(course);
    }

    @Transactional
    @CacheEvict(value = "courses", allEntries = true)
    public CourseDto createCourse(CreateCourseRequest request, UUID instructorId, Tenant tenant) {
        User instructor = userRepository.findById(instructorId)
                .orElseThrow(() -> new EntityNotFoundException("Instructor not found"));

        Course course = new Course();
        course.setTitle(request.getTitle());
        course.setDescription(request.getDescription());
        course.setStatus(CourseStatus.DRAFT);
        course.setInstructor(instructor);
        course.setTenant(tenant);

        return mapToDto(courseRepository.save(course));
    }

    @Transactional
    @CacheEvict(value = "courses", allEntries = true)
    public CourseDto updateCourse(UUID id, UpdateCourseRequest request) {
        Course course = courseRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Course not found"));

        checkInstructorAccess(course);

        course.setTitle(request.getTitle());
        course.setDescription(request.getDescription());

        return mapToDto(courseRepository.save(course));
    }

    @Transactional
    @CacheEvict(value = "courses", allEntries = true)
    public void deleteCourse(UUID id) {
        Course course = courseRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Course not found"));
        checkInstructorAccess(course);
        courseRepository.deleteById(id);
    }

    @Transactional
    @CacheEvict(value = "courses", allEntries = true)
    public CourseDto publishCourse(UUID id) {
        Course course = courseRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Course not found"));

        List<Module> modules = moduleRepository.findByCourseIdOrderByOrderIndexAsc(course.getId());
        if (modules.isEmpty()) {
            throw new IllegalArgumentException("Cannot publish course without modules");
        }

        for (Module module : modules) {
            List<Lesson> lessons = lessonRepository.findByModuleIdOrderByOrderIndexAsc(module.getId());
            if (lessons.isEmpty()) {
                throw new IllegalArgumentException("Cannot publish course: module '" + module.getTitle() + "' has no lessons");
            }
        }

        course.setStatus(CourseStatus.PUBLISHED);
        return mapToDto(courseRepository.save(course));
    }

    @Transactional
    @CacheEvict(value = "courses", allEntries = true)
    public CourseDto unpublishCourse(UUID id) {
        Course course = courseRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Course not found"));
        checkInstructorAccess(course);
        course.setStatus(CourseStatus.DRAFT);
        return mapToDto(courseRepository.save(course));
    }

    @Transactional
    @CacheEvict(value = "courses", allEntries = true)
    public CourseDto archiveCourse(UUID id) {
        Course course = courseRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Course not found"));
        checkInstructorAccess(course);
        course.setStatus(CourseStatus.ARCHIVED);
        return mapToDto(courseRepository.save(course));
    }

    @Transactional
    @CacheEvict(value = "courses", allEntries = true)
    public ModuleDto addModule(UUID courseId, CreateModuleRequest request) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new EntityNotFoundException("Course not found"));

        List<Module> existingModules = moduleRepository.findByCourseIdOrderByOrderIndexAsc(courseId);
        int nextOrder = existingModules.size() + 1;

        Module module = new Module();
        module.setTitle(request.getTitle());
        module.setOrderIndex(nextOrder);
        module.setCourse(course);
        module.setTenant(course.getTenant());

        return mapModuleToDto(moduleRepository.save(module));
    }

    @Transactional
    @CacheEvict(value = "courses", allEntries = true)
    public ModuleDto updateModule(UUID moduleId, CreateModuleRequest request) {
        Module module = moduleRepository.findById(moduleId)
                .orElseThrow(() -> new EntityNotFoundException("Module not found"));
        checkInstructorAccess(module.getCourse());

        module.setTitle(request.getTitle());
        return mapModuleToDto(moduleRepository.save(module));
    }

    @Transactional
    @CacheEvict(value = "courses", allEntries = true)
    public void deleteModule(UUID moduleId) {
        Module module = moduleRepository.findById(moduleId)
                .orElseThrow(() -> new EntityNotFoundException("Module not found"));
        checkInstructorAccess(module.getCourse());
        moduleRepository.delete(module);
    }

    @Transactional
    @CacheEvict(value = "courses", allEntries = true)
    public LessonDto addLesson(UUID moduleId, CreateLessonRequest request) {
        Module module = moduleRepository.findById(moduleId)
                .orElseThrow(() -> new EntityNotFoundException("Module not found"));

        List<Lesson> existingLessons = lessonRepository.findByModuleIdOrderByOrderIndexAsc(moduleId);
        int nextOrder = existingLessons.size() + 1;

        Lesson lesson = new Lesson();
        lesson.setTitle(request.getTitle());
        lesson.setContent(request.getContent());
        lesson.setOrderIndex(nextOrder);
        lesson.setModule(module);
        lesson.setTenant(module.getTenant());
        
        if (request.getVideoAssetId() != null) {
            MediaAsset asset = mediaAssetRepository.findById(request.getVideoAssetId())
                    .orElseThrow(() -> new EntityNotFoundException("MediaAsset not found"));
            lesson.setVideoAsset(asset);
        }

        return mapLessonToDto(lessonRepository.save(lesson));
    }

    @Transactional
    @CacheEvict(value = "courses", allEntries = true)
    public LessonDto updateLesson(UUID lessonId, CreateLessonRequest request) {
        Lesson lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> new EntityNotFoundException("Lesson not found"));
        checkInstructorAccess(lesson.getModule().getCourse());

        lesson.setTitle(request.getTitle());
        lesson.setContent(request.getContent());

        if (request.getVideoAssetId() != null) {
            MediaAsset asset = mediaAssetRepository.findById(request.getVideoAssetId())
                    .orElseThrow(() -> new EntityNotFoundException("MediaAsset not found"));
            lesson.setVideoAsset(asset);
        } else {
            lesson.setVideoAsset(null);
        }

        return mapLessonToDto(lessonRepository.save(lesson));
    }

    @Transactional
    @CacheEvict(value = "courses", allEntries = true)
    public void deleteLesson(UUID lessonId) {
        Lesson lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> new EntityNotFoundException("Lesson not found"));
        checkInstructorAccess(lesson.getModule().getCourse());
        lessonRepository.delete(lesson);
    }

    private CourseDto mapToDto(Course course) {
        CourseDto dto = new CourseDto();
        dto.setId(course.getId());
        dto.setTitle(course.getTitle());
        dto.setDescription(course.getDescription());
        dto.setStatus(course.getStatus());

        if (course.getInstructor() != null) {
            UserDto instructorDto = new UserDto();
            instructorDto.setId(course.getInstructor().getId());
            instructorDto.setName(course.getInstructor().getName());
            instructorDto.setEmail(course.getInstructor().getEmail());
            instructorDto.setAvatar(course.getInstructor().getAvatar());
            dto.setInstructor(instructorDto);
        }

        List<Module> modules = moduleRepository.findByCourseIdOrderByOrderIndexAsc(course.getId());
        dto.setModules(modules.stream().map(this::mapModuleToDto).collect(Collectors.toList()));

        return dto;
    }

    private ModuleDto mapModuleToDto(Module module) {
        ModuleDto dto = new ModuleDto();
        dto.setId(module.getId());
        dto.setTitle(module.getTitle());
        dto.setOrderIndex(module.getOrderIndex());

        List<Lesson> lessons = lessonRepository.findByModuleIdOrderByOrderIndexAsc(module.getId());
        dto.setLessons(lessons.stream().map(this::mapLessonToDto).collect(Collectors.toList()));

        return dto;
    }

    private LessonDto mapLessonToDto(Lesson lesson) {
        LessonDto dto = new LessonDto();
        dto.setId(lesson.getId());
        dto.setTitle(lesson.getTitle());
        dto.setContent(lesson.getContent());
        dto.setOrderIndex(lesson.getOrderIndex());
        return dto;
    }
}
