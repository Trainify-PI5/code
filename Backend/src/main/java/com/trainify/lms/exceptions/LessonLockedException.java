package com.trainify.lms.exceptions;

import java.util.UUID;

public class LessonLockedException extends RuntimeException {

    public LessonLockedException(UUID lessonId) {
        super("Lesson " + lessonId + " is locked until the previous lesson is completed");
    }
}
