<?php
    class ConnectionManager {

        public function connect() {
            $servername = 'localoco-server.mysql.database.azure.com';
            $username = 'dzlywmlxnx';
            $password = 'F@ckD3bug!';
            $dbname = 'wad2_project';
            $port = '3306';
            
            // Create connection
            $pdoObject = new PDO(
                    "mysql:host=$servername;dbname=$dbname;port=$port", 
                    $username,
                    $password);

            $pdoObject->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION); // if fail, exception will be thrown
            

            return $pdoObject; // return pdo object (containing mysql connection info)
        }
    }
?>