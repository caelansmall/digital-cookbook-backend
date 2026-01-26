require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const router = express.Router();
const authMiddleware = require('../authMiddleware');
const { psgres } = require('../postgres-connect');
const cors = require('cors');

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
      username,
      cognitoSub
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
      webUser (firstname,lastname,email,phonenumber,username,cognitoSub)
    VALUES
    ($1,$2,$3,$4,$5,$6)
    RETURNING *;
    `;

    const values = [user.firstName,user.lastName,user.email,user.phoneNumber,user.username,user.cognitoSub];

    const { rows } = await psgres(query,values);

    return rows;
  } catch (error) {
    console.error(`[DB] Error:`,error);
    throw error;
  }

};

const readUserByCognitoSub = async (
  sub,
) => {
  console.info(`[DB] readUserByCognitoSub(${sub})`);

  try {

    const query = `
    SELECT
      w.id,
      w.firstName,
      w.lastName,
      w.email,
      w.phoneNumber,
      w.username,
      w.cognitoSub
    FROM
      webUser w
    WHERE
      w.cognitoSub = $1
    `;

    values = [sub];

    const { rows } = await psgres(query,values);

    return rows;
  } catch (error) {
    console.error('[DB] Error:',error);
    throw error;
  }
}

module.exports = {
  readUserByUsername,
  readUserByCognitoSub,
  createUser,
}
