import { Hono } from 'hono';
import BusinessController from 'controllers/business.controller';
import protectRoute from '../middleware/protect-route';

const businessRouter = new Hono()

// this route fetches all the businesses
businessRouter.get('/', BusinessController.getAllBusinesses);

// triggered by a user using the filters, this route fetches business objects matching the filters
businessRouter.get('/filter', BusinessController.getFilteredBusinesses)

// triggered by a user clicking the View Details button, this route fetches a single business from the database
businessRouter.get('/:uen', BusinessController.getBusinessByUen)

// search for a business by name (for forum tagging)
businessRouter.get('/search', BusinessController.searchBusinessByName)

// triggered by a user clicking the My Businesses button, this route fetches the business/es owned by a user
businessRouter.get('/owned', protectRoute , BusinessController.getOwnedBusinesses)

// this route handles business registration
businessRouter.post('/register-business', BusinessController.registerBusiness)

// this route handles updates to business details 
businessRouter.put('/update-business', protectRoute ,BusinessController.updateBusiness)

// this route handles business deletions
businessRouter.delete('/delete-business', protectRoute , BusinessController.deleteBusiness)

// Check uen uniqueness for registration purposes
businessRouter.get('/check-uen',BusinessController.checkUenAvailability);

export default businessRouter