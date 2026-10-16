import { config } from "../config";
import { openDatabase } from "./connection";
import { seedDemo } from "./seed";

const db = openDatabase(config.DATABASE_PATH);
const result = seedDemo(db);
console.log(result.created ? `Seeded the Saffron Garden sample menu at /m/${result.slug}` : "Sample menu already exists.");
db.close();
