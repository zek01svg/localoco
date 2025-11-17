import { MySqlRawQueryResult } from "drizzle-orm/mysql2";
import { ResultSetHeader } from "mysql2";


export default function checkDbResult(rawResult:MySqlRawQueryResult):boolean {

    const result:ResultSetHeader = rawResult[0]
    return result.affectedRows > 0
    
}