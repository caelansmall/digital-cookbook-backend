require('dotenv').config();
const { psgres } = require('../postgres-connect');

const readInstructionsByRecipeId = async (
  recipeId,
) => {
  console.info(`[DB] readInstructionsByRecipeId(${recipeId})`);

  try {

    const query = `
    SELECT
      rs.id,
      rs.recipeId,
      rs.stepNumber,
      rs.instruction
    FROM
      recipe_steps rs
    WHERE
      rs.recipe_id = ${recipeId}
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
      recipe_steps (recipeId,stepNumber,instruction)
    VALUES
      ($1,$2,$3})
    RETURNING id
    `;

    const values = [entity.recipeId,entity.stepNumber,entity.name];

    const { rows } = await psgres(query,values);

    return rows.id;
  } catch (error) {
    console.error(`[DB] Error:`,error);
    throw error;
  }
}

module.exports = {
  readInstructionsByRecipeId,
 createInstruction,
}