require('dotenv').config();
const { psgres } = require('../postgres-connect');

const readRecipeById = async (
  recipeId,
) => {
  console.info(`[DB] readRecipeById(${recipeId})`);

  try {

    const query = `
    SELECT
      id,
      title,
      description,
      createdBy,
      dateCreated
    FROM
      recipe
    WHERE
      id = ${recipeId}
    `;

    const { rows } = await psgres(query);

    return rows;
  } catch (error) {
    console.error(`[DB] Error:`,error);
    throw error;
  }

};

const readRecipesByUserId = async (
  userId,
) => {
  console.info(`[DB] readRecipesByUserId(${userId})`);

  try {

    const query = `
    SELECT
      r.id,
      r.title,
      r.description,

      COALESCE(ingred, '[]') AS ingredients,
      COALESCE(instruc, '[]') AS instructions,

      r.createdBy,
      r.dateCreated
    FROM
      recipe r
    LEFT JOIN LATERAL (
      SELECT jsonb_agg(
        json_build_object(
          'name', i.name,
          'quantity', ia.quantity
        )
        ORDER BY i.name ASC
      ) AS ingredients
      FROM
        ingredientAmount ia
      JOIN
        ingredient i
      ON
        i.id = ia.ingredientId
      WHERE
        ia.recipeId = r.id
    ) ingred ON true
    
    LEFT JOIN LATERAL (
      SELECT jsonb_agg(
        json_build_object(
          'stepNumber', ins.stepNumber,
          'instruction', ins.instruction
        )
        ORDER BY ins.stepNumber ASC
      ) AS instructions
      FROM
        recipe_steps ins
      WHERE
        ins.recipeId = r.id
    ) instruc ON true
    WHERE
      r.createdBy = $1
    `;

    const values = [userId];

    const { rows } = await psgres(query,values);

    return rows;
  } catch (error) {
    console.error(`[DB] Error:`,error);
    throw error;
  }

};

const createRecipe = async (
  entity,
) => {
  console.info(`[DB] createRecipe(entity)`,entity);

  try {

    const query = `
    INSERT INTO
      recipe (title,description,createdBy,dateCreated)
    VALUES
      ($1,$2,$3,NOW())
    RETURNING id
    `;

    const values = [entity.title.trim(),entity.description.trim(),+entity.userId];

    const { rows } = await psgres(query,values);

    return rows.id;
  } catch (error) {
    console.error('[DB] Error:',error);
    throw error;
  }

};

module.exports = {
  readRecipeById,
  readRecipesByUserId,
  createRecipe,
}