import BusinessService from '../services/business.service';
import UserService from '../services/user.service';
import { sendEmail, generateNewBusinessListingEmail } from '../lib/mailer';
import { Context } from 'hono'
import { HTTPException } from 'hono/http-exception';
import { checkUenAvailabilitySchema, deleteBusinessSchema, getBusinessByUenSchema, getFilteredBusinessesSchema, getOwnedBusinessesSchema, registerBusinessSchema, searchBusinessByNameSchema, updateBusinessSchema } from '../../shared/zod-schemas/business.schema';

class BusinessController {

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

    static async getAllBusinesses(c: Context): Promise<Response> {
        const businesses = await BusinessService.getAllBusinesses();                
        return c.json(businesses, 200);
    }
    
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