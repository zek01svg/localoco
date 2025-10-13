<?php
class User {
    
    private $firstName;
    private $lastName;
    private $email;
    private $password;
    private $role;

    public function __construct($firstName, $lastName, $email, $password, $role)
    {
        $this->firstName = $firstName;        
        $this->lastName = $lastName;        
        $this->email = $email;        
        $this->password = $password;        
        $this->role = $role;        
    }

    // getters

    public function getFirstname () {
        return $this->firstName;
    }

    public function getLastname () {
        return $this->lastName;
    }
    
    public function getEmail () {
        return $this->email;
    }
    public function getPassword () {
        return $this->password;
    }
    public function getRole () {
        return $this->role;
    }

    // setters

    public function setFirstname ($firstName) {
        return $this->firstName = $firstName;
    }

    public function setLastname ($lastName) {
        return $this->lastName = $lastName;
    }
    
    public function setEmail ($email) {
        return $this->email = $email;
    }
    public function setPassword ($password) {
        return $this->password = $password;
    }
    public function setRole ($role) {
        return $this->role = $role;
    }
}
?>
