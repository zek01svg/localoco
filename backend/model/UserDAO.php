<?php
    spl_autoload_register(
        function ($class) {
            require_once "$class.php";
        }
);

class UserDAO {
    // the functions that do not return objects (i.e. return a statement regarding the result 
    // of the operation) do not return boolean values but instead return text errors
    
    // use this function to register a user
    public function registerUser($firstName, $lastName, $email, $hashedPassword, $role) {
        try {
            # Step 1: Connect to the database
            $connMgr = new ConnectionManager();
            $pdo = $connMgr->connect();
            
            # Step 2: Prepare SQL statement
            $sql = 'INSERT INTO users (firstName, lastName, email, password, role)
                    VALUES (:firstName, :lastName, :email, :hashedPassword, :role)';
            $stmt = $pdo->prepare($sql);

            $stmt->bindParam(':firstName', $firstName, PDO::PARAM_STR);
            $stmt->bindParam(':lastName', $lastName, PDO::PARAM_STR);
            $stmt->bindParam(':email', $email, PDO::PARAM_STR);
            $stmt->bindParam(':hashedPassword', $hashedPassword, PDO::PARAM_STR);
            $stmt->bindParam(':role', $role, PDO::PARAM_STR);

            # Step 3: Execute SQL statement
            $stmt->execute();

            return true; 

        } catch (PDOException $e) {
            // if it's a duplicate email error (MySQL error code 1062)
            if ($e->errorInfo[1] == 1062) {
                return false;
            } else {
                return "Database Error: " . $e->getMessage();
            }
        } finally {
            # Step 5: Clean up resources
            $stmt = null;
            $pdo = null;
        }
    }

    
    // this method returns the details of only one user 
    public function getUserByEmail($email) {

        # Step 1: Connect to the database
        $connMgr = new ConnectionManager();
        $pdo = $connMgr->connect();

        # Step 2: Prepare SQL statement
        $sql = 'SELECT * FROM users
                where email = :email';
        $stmt = $pdo->prepare($sql);
        $stmt->bindParam(':email', $email, PDO::PARAM_STR);

        # Step 3: Execute SQL statement
        $stmt->execute();

        # Step 4: Retrieve  matching result
        $result = []; # Array to store objects retrieved from data storage
        $stmt->setFetchMode(PDO::FETCH_ASSOC);
        $rows = $stmt->fetchAll();
        foreach ($rows as $row) {
            $firstName = $row['firstName'];
            $lastName = $row['lastName'];
            $email = $row['email'];
            $password = $row['password'];
            $role = $row['role'];

            $user  = new User($firstName, $lastName, $email, $password, $role);
        }

        # Step 5: Clean up resources
        $stmt = null;
        $pdo = null;

        # Return user object
        return $user;
    }
}
