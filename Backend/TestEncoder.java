import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

public class TestEncoder {
    public static void main(String[] args) {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        String hash = "$2a$10$0Krh.jeNxPU7EDsULw9qZ.qc0LeXrupbr72zDao2IRoLFDgaGYLVy";
        System.out.println("Matches: " + encoder.matches("admin123", hash));
    }
}
