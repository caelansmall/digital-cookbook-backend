require('dotenv').config();
const { psgres } = require('../postgres-connect');

const readIngredientsByRecipeId = async (
  recipeId,
) => {
  console.info(`[DB] readIngredientsByRecipeId(${recipeId})`);

  try {

    const query = `
    SELECT
      ia.id,
      ia.recipeId,
      ia.ingredientId,
      i.name, 
      ia.quantity,
    FROM
      ingredientamount ia
    JOIN
      ingredient i 
    ON
      i.id = ia.ingredientid 
    WHERE
      ia.recipeId = ${recipeId}
    `;

    const { rows } = await psgres(query);

    return rows;
  } catch (error) {
    console.error(`[DB] Error:`,error);
    throw error;
  }

};

const createIngredient = async (
  entity,
) => {
  console.info(`[DB] createIngredients(entity)`,entity);

  try {

    const query = `
    INSERT INTO
      ingredient (name)
    VALUES
      ($1)
    RETURNING id
    `;

    const values = [entity.name.trim()];

    const { rows } = await psgres(query,values);

    return rows[0].id;
  } catch (error) {
    console.error(`[DB] Error`,error);
    throw error;
  }

};

const createIngredientAmount = async (
  entity,
) => {
  console.info(`[DB] createIngredientAmount(entity)`,entity);

  try {

    const query = `
    INSERT INTO
      ingredientAmount (recipeId,ingredientId,quantity)
    VALUES
      ($1,$2,$3)
    RETURNING id
    `;

    const values = [entity.recipeId,entity.ingredientId,entity.quantity.trim()];

    const { rows } = await psgres(query,values);
    
    return rows[0].id;
  } catch (error) {
    console.error(`[DB] Error:`,error);
    throw error;
  }

};

const verifyExistingIngredient = async (
  ingredientName,
) => {
  console.info(`[DB] verifyExistingIngredient(${ingredientName})`);

  try {

    const query = `
    SELECT
      id
    FROM
      ingredient
    WHERE
      TRIM(UPPER(name)) = TRIM(UPPER($1))
    `;

    const values = [ingredientName];

    const { rows } = await psgres(query,values);

    if(
      rows
      && rows.length > 0
    ) {
      return rows[0].id;
    } else return null;
  } catch (error) {
    console.error(`[DB] Error:`,error);
    throw error;
  }

};

const readIngredientsByPartialName = async (
  partialName
) => {
  console.info(`[DB] readIngredientsByPartialName(${partialName})`);

  try {

    const query = `
    SELECT
      i.id,
      i.name
    FROM
      ingredient i
    WHERE
      TRIM(UPPER(i.name)) LIKE '${partialName.toUpperCase().trim()}%'
    `;

    const { rows } = await psgres(query);

    return rows;
  } catch (error) {
    console.error(`[DB] Error:`,error);
    throw error;
  }

}

module.exports = {
  readIngredientsByRecipeId,
  createIngredient,
  createIngredientAmount,
  verifyExistingIngredient,
  readIngredientsByPartialName
}
