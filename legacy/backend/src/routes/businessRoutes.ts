import { Router } from 'express'
import businessController from '../controllers/businessController.js'

const businessRouter = Router()

// this route fetches all the businesses
businessRouter.get('/api/businesses', businessController.getAllBusinesses.bind(businessController));

// triggered by a user using the filters, this route fetches business objects matching the filters
businessRouter.post('/api/businesses/filter', businessController.getFilteredBusinesses.bind(businessController))

// triggered by a user clicking the View Details button, this route fetches a single business from the database
businessRouter.get('/api/business', businessController.getBusinessByUEN.bind(businessController))

// search for a business by name (for forum tagging)
businessRouter.get('/api/businesses/search', businessController.searchBusinessByName.bind(businessController))

// triggered by a user clicking the My Businesses button, this route fetches the business/es owned by a user
businessRouter.post('/api/businesses/owned', businessController.getOwnedBusinesses.bind(businessController))

// this route handles business registration
businessRouter.post('/api/register-business', businessController.registerBusiness.bind(businessController))

// this route handles updates to business details 
businessRouter.post('/api/update-business', businessController.updateBusiness.bind(businessController))

// this route handles business deletions
businessRouter.post('/api/delete-business', businessController.deleteBusiness.bind(businessController))

// Check UEN uniqueness
businessRouter.get('/api/check-uen', businessController.checkUenAvailability.bind(businessController));

export default businessRouter