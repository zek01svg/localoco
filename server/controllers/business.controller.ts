import BusinessService from '../services/business.service';
import UserService from '../services/user.service';
import { sendEmail, generateNewBusinessListingEmail } from '../lib/mailer';
import { Context } from 'hono'
import { HTTPException } from 'hono/http-exception';
import { checkUenAvailabilitySchema, deleteBusinessSchema, getBusinessByUenSchema, getFilteredBusinessesSchema, getOwnedBusinessesSchema, registerBusinessSchema, searchBusinessByNameSchema, updateBusinessSchema } from '../../shared/zod-schemas/business.schema';

class BusinessController {

    /**
     * Registers a new business and sends a email informing the user of the new business listing.
     * @param {Context} c - The Hono context.
     * @throws {ZodError} If the request body fails validation.
     * @returns {Promise<Response>} A JSON response with a success message.
     */
    static async registerBusiness(c: Context): Promise<Response> {

        const payload = c.req.json()
        const validationResult = registerBusinessSchema.safeParse(payload)

        if (!validationResult.success) {
            throw validationResult.error
        }

        const business = validationResult.data

        const emailInfo = {
            uen: business.uen,
            businessName: business.businessName,
            businessCategory: business.businessCategory,
            address: business.address
        };
        
        await BusinessService.registerBusiness(business);
        
        const ownerEmail = (await UserService.getUserById(business.ownerId)).profile!.email;
        const subject = 'Your Listing is Live!';
        const htmlBody = generateNewBusinessListingEmail(emailInfo);
        await sendEmail(ownerEmail, subject, htmlBody);

        return c.json({
            message: 'Business has been registered',
        }, 201);
    }

    /**
     * Retrieves all businesses.
     * @param {Context} c - The Hono context.
     * @returns {Promise<Response>} A JSON response containing an array of all businesses.
     */
    static async getAllBusinesses(c: Context): Promise<Response> {
        const businesses = await BusinessService.getAllBusinesses();                
        return c.json(businesses, 200);
    }
    
    /**
     * Retrieves businesses based on applied filters.
     * @param {Context} c - The Hono context.
     * @throws {ZodError} If the request body (filters) fails validation.
     * @returns {Promise<Response>} A JSON response containing an array of filtered businesses.
     */
    static async getFilteredBusinesses(c: Context): Promise<Response> {

        const payload = await c.req.json();
        const validationResult = getFilteredBusinessesSchema.safeParse(payload)
        
        if (!validationResult.success) {
            throw validationResult.error
        }

        const filters = validationResult.data
        const filteredBusinesses = await BusinessService.getFilteredBusinesses(filters);
        return c.json(filteredBusinesses, 200);
    }
    
    /**
     * Retrieves a single business by its UEN.
     * @param {Context} c - The Hono context.
     * @throws {ZodError} If the UEN parameter fails validation.
     * @throws {HTTPException} If the business with the specified UEN is not found.
     * @returns {Promise<Response>} A JSON response containing the business object.
     */
    static async getBusinessByUen(c: Context): Promise<Response> {
        const payload = c.req.param('uen');
        const validationResult = getBusinessByUenSchema.safeParse({uen: payload})

        if (!validationResult.success) {
            throw validationResult.error
        }

        const uen = validationResult.data.uen

        const business = await BusinessService.getBusinessByUen(uen);
        if (business === null) {
            throw new HTTPException(404, { message: `Business with UEN ${uen} not found` });
        }

        return c.json(business, 200);
    }

    /**
     * Searches for businesses by name.
     * @param {Context} c - The Hono context.
     * @throws {ZodError} If the name query parameter fails validation.
     * @throws {HTTPException} If no business is found matching the name.
     * @returns {Promise<Response>} A JSON response containing the matching business(es).
     */
    static async searchBusinessByName(c: Context): Promise<Response> {

        const payload = c.req.query('name');
        const validationResult = searchBusinessByNameSchema.safeParse({name: payload})

        if (!validationResult.success) {
            throw validationResult.error
        }

        const searchName = validationResult.data.name

        const business = await BusinessService.searchBusinessByName(searchName);
        if (!business) {
            throw new HTTPException(404, { message: 'Business not found' });
        }

        return c.json(business, 200);
    }

    /**
     * Retrieves all businesses owned by a specific user.
     * @param {Context} c - The Hono context.
     * @throws {ZodError} If the ownerId parameter fails validation.
     * @returns {Promise<Response>} A JSON response containing an array of owned businesses.
     */
    static async getOwnedBusinesses(c: Context): Promise<Response> {

        const payload = c.req.param('ownerId');
        const validationResult = getOwnedBusinessesSchema.safeParse({ownerId: payload})

        if (!validationResult.success) {
            throw validationResult.error
        }

        const ownerId = validationResult.data.ownerId

        const ownedBusinesses = await BusinessService.getOwnedBusinesses(ownerId);

        return c.json(ownedBusinesses, 200);

    }
    
    /**
     * Updates an existing business's details.
     * @param {Context} c - The Hono context.
     * @throws {ZodError} If the request body fails validation.
     * @returns {Promise<Response>} A JSON response with a success message and the updated business object.
     */
    static async updateBusiness(c: Context): Promise<Response> {

        const payload = c.req.json()
        const validationResult = updateBusinessSchema.safeParse(payload)

        if (!validationResult.success) {
            throw validationResult.error
        }

        const business = validationResult.data

        const updatedBusiness = await BusinessService.updateBusiness(business);

        return c.json({
            message: 'Business has been updated successfully',
            updatedBusiness: updatedBusiness[0]
        }, 200);
    }

    /**
     * Deletes a business by its UEN.
     * @param {Context} c - The Hono context.
     * @throws {ZodError} If the request body (containing UEN) fails validation.
     * @returns {Promise<Response>} A JSON response with a success message.
     */
    static async deleteBusiness(c: Context): Promise<Response> {

        const payload = c.req.json()
        const validationResult = deleteBusinessSchema.safeParse(payload)

        if (!validationResult.success) {
            throw validationResult.error
        }

        const uen = validationResult.data.uen
        
        await BusinessService.deleteBusiness(uen);
        return c.json({ 
            message: 'Business has been deleted successfully' 
        }, 200);

    }

    /**
     * Checks if a UEN is already registered in the database.
     * @param {Context} c - The Hono context.
     * @throws {ZodError} If the UEN query parameter fails validation.
     * @returns {Promise<Response>} A JSON response indicating if the UEN is available (true/false).
     */
    static async checkUenAvailability(c: Context): Promise<Response> {

        const payload = c.req.query('uen')
        const validationResult = checkUenAvailabilitySchema.safeParse({uen: payload})

        if (!validationResult.success) {
            throw validationResult.error
        }

        const uen = validationResult.data.uen

        const exists = await BusinessService.checkUenExists(uen);
        return c.json({ 
            uenAvailability: exists 
        }, 200);
    }
}

export default BusinessController;