require('dotenv').config();
const router = require('express').Router(),
      cookieParser = require('cookie-parser'),
      authMiddleware = require('../authMiddleware'),
      cache = require('../components/nodeCache'),
      readCache = require('./middleware/cacheRead'),
      cors = require('cors');

const { 
  readRecipeById,
  readRecipesByUserId,
  createRecipe,
  createIngredient,
  createIngredientAmount,
  createInstruction,
  verifyExistingIngredient
} = require('../api');

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

router.route('/:recipeId')
.get(
  readCache,
  async (req,res) => {
    try {
      const recipeId = req.params.recipeId;

      let data = await readRecipeById(recipeId);

      cache.set(
        req.originalUrl,
        data,
        10 * 60
      );

      return res.status(200).json(data);
    } catch (error) {
      console.error(`[API] Error:`,error);
      return res.status(400).json(error);
    }
  }
);

router.route('/user/:userId')
.get(
  readCache,
  async(req,res) => {
    try {

      const userId = req.params.userId;

      let data = await readRecipesByUserId(userId);

      cache.set(
        req.originalUrl,
        data,
        10 * 60
      );

      return res.status(200).json(data);
    } catch (error) {
      console.error(`[API] Error:`,error);
      return res.status(400).json(error);
    }
  }
);

router.route('/')
.post(
  authMiddleware,
  async (req,res) => {

    try {

      const recipe = req.body;

      const newRecipeId = await createRecipe({
        title: recipe.title.trim(),
        description: recipe.description ? recipe.description.trim() : null,
        userCreatedId: recipe.userCreatedId,
      });

      if (newRecipeId < 0) {
        console.error(`[DB] Error entering new recipe`);
        return res.status(400);
      } else {
        const recipeIngredients = recipe.ingredients;

        for(let i=0; i<recipeIngredients.length; i++) {

          let ingredientFound;

          if(
            recipeIngredients[i].ingredientId
            && recipeIngredients[i].ingredientId >= 0
          ) {
            // set ingredientFound
            ingredientFound = recipeIngredients[i].ingredientId;
          } else {
            // find ingredient ID by name
            ingredientFound = await verifyExistingIngredient(recipeIngredients[i].name);

            if(!ingredientFound || ingredientFound < 0) {
              // create ingredient
              ingredientFound = await createIngredient({
                name: recipeIngredients[i].name.trim(),
              });

              if(ingredientFound < 0) {
                console.error(`[DB] Error entering new ingredient`,error);
                throw error;
              }
            }
          }

          // create ingredientAmount entry
          const newIngredientAmount = await createIngredientAmount({
            recipeId: newRecipeId,
            ingredientId: ingredientFound,
            quantity: recipeIngredients[i].quantity,
          });

          if(newIngredientAmount < 0) {
            console.error(`[DB] Error entering new ingredientAmount`,error);
            throw error;
          }
        }

        const recipeInstructions = recipe.instructions;

        for(let i=0; i<recipeInstructions.length; i++) {
          const newInstructionId = await createInstruction({
            recipeId: newRecipeId,
            stepNumber: recipeInstructions[i].stepNumber,
            instruction: recipeInstructions[i].name,
          });

          if(newInstructionId < 0) {
            console.error(`[DB] Error entering new instruction`,error);
            throw error;
          }
        }
      }

      cache.del(
        cache.keys().filter((key) => 
          (
            key.includes('/api/recipes') ||
            key.includes('/api/ingredients') ||
            key.includes('/api/instructions')
          )
        )
      );

      return res.status(200).json(newRecipeId);
    } catch (error) {
      console.error(`[API] Error:`,error);
      throw error;
    }
  }
);

module.exports = router;
