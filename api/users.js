require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const router = express.Router();
const authMiddleware = require('../authMiddleware');
const { psgres } = require('../postgres-connect');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 8080;

const allowedOrigins = ["http://localhost:5173",];

// CORS middleware
const corsOptions = {
  origin: allowedOrigins,
  methods: ["GET", "POST", "PUT"],
  allowedHeaders: ["Content-Type",],
  credentials: true,
  maxAge: 10
};

router.use(cors(corsOptions));
router.use(cookieParser(process.env.COOKIE_SECRET));
router.use(authMiddleware);

const readUserByUsername = async (
  username,
) => {
  console.info(`[DB] readUserByUsername(${username})`);

  try {
    
    const query = `
    SELECT
      id,
      firstname,
      lastname,
      email,
      phonenumber,
      username
    FROM
      webUser
    WHERE
      username = '${username}'
    `;

    const { rows } = await psgres(query);

    return rows;
  } catch (error) {
    console.error(`[DB] Error:`,error);
    throw error;
  }

};

const createUser = async (
  user,
) => {
  console.info(`[DB] createUser(user)`,user);

  try {

    const query = `
    INSERT INTO
      webUser (firstname,lastname,email,phonenumber,username)
    VALUES
    (
      '${user.firstName ? user.firstName : ''}',
      '${user.lastName ? user.lastName : ''}',
      '${user.email ? user.email : ''}',
      '${user.phoneNumber ? user.phoneNumber : ''}',
      '${user.username ? user.username : ''}'
    )
    RETURNING *;
    `;

    const { rows } = await psgres(query);

    console.log(rows);

    return rows;
  } catch (error) {
    console.error(`[DB] Error:`,error);
    throw error;
  }

};

module.exports = {
  readUserByUsername,
  createUser,
}