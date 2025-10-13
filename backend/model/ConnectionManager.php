<?php
class ConnectionManager {

    public function connect() {
        $servername = 'localoco-server.mysql.database.azure.com';
        $username = 'dzlywmlxnx';
        $password = 'F@ckD3bug!';
        $dbname = 'wad2_project';
        $port = '3306';

        // Detect environment - Windows vs Linux
        if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
            $ssl_ca = "C:\\ssl\\combined-ca-certificates.pem";
        } else {
            // Azure Linux - use system certificates
            $ssl_ca = true;
        }

        $pdoOptions = [
            PDO::MYSQL_ATTR_SSL_CA => $ssl_ca,
            PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT => false,
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
