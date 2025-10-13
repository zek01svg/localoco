<?php
class ConnectionManager {

    public function connect() {
        $servername = 'localoco-server.mysql.database.azure.com';
        $username = 'dzlywmlxnx';
        $password = 'F@ckD3bug!';
        $dbname = 'wad2_project';
        $port = '3306';
        $ssl_ca = "C:\ssl\combined-ca-certificates.pem"; // your CA cert

        $pdoOptions = [
            PDO::MYSQL_ATTR_SSL_CA => $ssl_ca,
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
        ];

        $pdoObject = new PDO(
            "mysql:host=$servername;dbname=$dbname;port=$port;charset=utf8mb4",
            $username,
            $password,
            $pdoOptions
        );

        return $pdoObject;
    }
}
?>
