<?php
session_start();
spl_autoload_register(
    function ($class) {
        require_once "C:\wamp64\www\IS216\wad2-project\backend\model/$class.php";
    }
); 
$userDAO = new UserDAO();
$businessDAO = new BusinessDAO();
?> 