import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

public class TestLogin {
    public static void main(String[] args) {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        // hash from database
        String hashFromDb = "$2a$10$tZ2RItF8H2O7P0.N2s.k/OoC.l0FfR1aT.J/uW9kX2yW.6e.y"; // I'll replace this with the actual hash
    }
}
