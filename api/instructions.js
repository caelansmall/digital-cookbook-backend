require('dotenv').config();
const { psgres } = require('../postgres-connect');

const readInstructionsByRecipeId = async (
  recipeId,
) => {
  console.info(`[DB] readInstructionsByRecipeId(${recipeId})`);

  try {

    const query = `
    SELECT
      i.id,
      i.recipeId,
      i.stepNumber,
      i.instruction
    FROM
      instruction i
    WHERE
      i.recipe_id = ${recipeId}
    `;

    const { rows } = psgres(query);

    return rows;
  } catch (error) {
    console.error(`[DB] Error:`,error);
    throw error;
  }

};

const createInstruction = async (
  entity,
) => {
  console.info(`[DB] createInstruction(entity)`,entity);

  try {

    const query = `
    INSERT INTO
      instruction (recipeId,stepNumber,instruction)
    VALUES
      ($1,$2,$3)
    RETURNING id
    `;

    const values = [entity.recipeId,entity.stepNumber,entity.instruction];

    const { rows } = await psgres(query,values);

    return rows[0].id;
  } catch (error) {
    console.error(`[DB] Error:`,error);
    throw error;
  }
}

module.exports = {
  readInstructionsByRecipeId,
  createInstruction,
}
