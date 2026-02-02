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
  verifyExistingIngredient,
  deleteRecipeById,
  updateRecipeById,
  readIngredientByName,
  deleteInstructionById,
  readRecipeByPartialName,
} = require('../api');

const allowedOrigins = ["http://localhost:5173",];

// CORS middleware
const corsOptions = {
  origin: allowedOrigins,
  methods: ["GET", "POST", "DELETE"],
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
)
.delete(
  authMiddleware,
  async (req,res) => {
    try {
      const recipeId = req.params.recipeId;

      let data = await deleteRecipeById(recipeId);

      cache.del(
        cache.keys().filter((key) =>
          (
            key.includes('/api/recipe')
          )
        )
      );

      return res.status(200).json(data);
    } catch (error) {
      console.error(`[API] Error:`,error);
      return res.status(400).json(error);
    }
  }
)
.put(
  authMiddleware,
  async (req,res) => {
    try {
      const recipeId = req.params.recipeId;
      const newRecipe = req.body;

      const oldRecipe = await readRecipeById(recipeId);
      
      if(
        newRecipe.title.trim().toUpperCase() !== oldRecipe.title.trim().toUpperCase()
        || (newRecipe.description ? newRecipe.description.trim().toUpperCase() : null) !== (oldRecipe.description ? oldRecipe.description.trim().toUpperCase() : null)
      ) {
        const updatedRecipe = await updateRecipeById(newRecipe);

        if(!updatedRecipe) {
          return res.status(400);
        }
      }

      const oldInstructions = new Map(
        oldRecipe.instructions
        .filter(i => i.id !== null && i.id !== undefined)
        .map(i => [Number(i.id), i]));

      const seenOldInstructions = new Set();
      const newInstructions = newRecipe.instructions;

      for (let i=0; i<newInstructions.length; i++) {
        const instruct = newInstructions[i];
        const stepNumber = i + 1;

        if(instruct.id) {
          // existing entry
          const oldInstruction = oldInstructions.get(Number(instruct.id));
          seenOldInstructions.add(Number(instruct.id));
          if(!oldInstruction) continue;

          if ((
            oldInstruction.instruction.trim().toUpperCase() !== instruct.instruction.trim().toUpperCase())
            || (+oldInstruction.stepNumber !== stepNumber)
          ) {
            const updatedInstruct = await updateInstructionById({
              id: +instruct.id,
              instruction: instruct.instruction,
              stepNumber: stepNumber
            });

            if (!updatedInstruct) {
              return res.status(400);
            }
          }
        } else {
          // new instruction
          const newCreatedInstruct = await createInstruction({
            recipeId: recipeId,
            stepNumber: stepNumber,
            instruction: newInstructions[i].instruction
          });

          if (!newCreatedInstruct) {
            return res.status(400);
          }
        }
      }

      for (const [id] of oldInstructions) {
        if (!seenOldInstructions.has(id)) {
          const deletedId = await deleteInstructionById(id);

          if (!deletedId) return res.status(400);
        }
      }

      const newIngredients = newRecipe.ingredients;
      const oldIngredients = oldRecipe.ingredients;

      let oldIngredAmountId = new Map(oldIngredients.map(r => [r.ingredientAmountId,r]));
      let seenIngredient = new Set();

      for (const ingred of newIngredients) {
        
        if (ingred.ingredientAmountId) {
          const olderCurrentIngredient = oldIngredAmountId.get(ingred.ingredientAmountId);
          seenIngredient.add(ingred.ingredientAmountId);

          let finalId = ingred.ingredientId;

          if(!finalId) {
            finalId = await readIngredientByName(ingred.name);

            if(!finalId) {
              finalId = await createIngredient({
                name: ingred.name,
              });
            }
          }

          const ingredientChanged = olderCurrentIngredient.ingredientId !== finalId;
          const quantityChanged = olderCurrentIngredient.quantity.trim().toUpperCase() !== ingred.quantity.trim().toUpperCase();

          if (ingredientChanged || quantityChanged) {
            const updatedIngredientAmount = await updateIngredientAmountById({
              recipeId: recipeId,
              ingredientId: finalId,
              quantity: ingred.quantity,
              ingredientAmountId: ingred.ingredientAmountId,
            });

            if(!updatedIngredientAmount) return res.status(400);
          }
        } else{
          // new ingredient amount
          let finalIngredientId = ingred.ingredientId;

          if (!finalIngredientId) {
            finalIngredientId = await readIngredientByName(ingred.name);

            if (!finalIngredientId) {
              finalIngredientId = await createIngredient({name: ingred.name});
            }
          }

          const newIngredAmountId = await createIngredientAmount({
            recipeId: recipeId,
            ingredientId: finalIngredientId,
            quantity: ingred.quantity
          });

          if(!newIngredAmountId) {
            return res.status(400)
           } else seenIngredient.add(newIngredAmountId);
        }
      }

      for (const oldEntry of oldIngredients) {
        if (!seenIngredient.has(oldEntry.ingredientAmountId)) {
          const deletedId = await deleteIngredientAmountById(oldEntry.ingredientAmountId);

          if(!deletedId) return res.status(400);
        }
      }

      cache.del(
        cache.keys().filter((key) =>
          (
            key.includes('/api/recipe') ||
            key.includes('/api/ingredient') ||
            key.includes('/api/instruction')
          )
        )
      );

      return res.status(200).json(recipeId);
    } catch (error) {
      console.error(`[API] Error:`,error);
      return res.status(400).json(error);
    }
  } 
);

router.route('/autocomplete')
.post(
  readCache,
  async (req,res) => {
    try {

      const { name, userId } = req.body;

      let data = await readRecipeByPartialName(name.trim(),userId);

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
  async (req,res) => {
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
            key.includes('/api/recipe') ||
            key.includes('/api/ingredient') ||
            key.includes('/api/instruction')
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
