import { Request, Response, NextFunction } from 'express';
import BusinessModel from '../models/BusinessModel.js';
import UserModel from '../models/UserModel.js';
import { sendEmail, generateNewBusinessListingEmail } from '../lib/mailer.js';


class businessController {

    static async getAllBusinesses(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const businesses = await BusinessModel.getAllBusinesses();
            res.status(200).json(businesses)
        } 
        catch (error) {
            console.error(`There was a problem fetching the businesses: ${error}`)
            next(error);
        }
    }

    static async getFilteredBusinesses(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const filteredBusinesses = await BusinessModel.getFilteredBusinesses(req.body);
            res.status(200).json(filteredBusinesses)            
        } 
        catch (error) {
            console.error(`There was a problem fetching the filtered businesses: ${error}`)
            next(error);
        }
    }
    
    static async getBusinessByUEN(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const business = await BusinessModel.getBusinessByUEN(String(req.query.uen))
            res.status(200).json(business);
        }
        catch (error) {
            console.error(`There was a problem fetching the selected business: ${error}`)
            next(error);
        }
    }

    static async searchBusinessByName(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const searchName = String(req.query.name || '').trim();

            if (!searchName) {
                res.status(400).json({ error: 'Name parameter is required' });
                return;
            }

            const business = await BusinessModel.searchBusinessByName(searchName);

            if (!business) {
                res.status(404).json({ error: 'Business not found' });
                return;
            }

            res.status(200).json(business);
        }
        catch (error) {
            console.error(`There was a problem searching for business: ${error}`)
            next(error);
        }
    }

    static async getOwnedBusinesses(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const ownedBusinesses = await BusinessModel.getOwnedBusinesses(String(req.body.ownerId))
            res.status(200).json(ownedBusinesses);
        }
        catch (error) {
            console.error(`There was a problem fetching the the owned business: ${error}`)
            next(error);
        }
    }

    static async registerBusiness(req: Request, res: Response, next: NextFunction): Promise<void> {

        const business = {
            ownerId: req.body.ownerId,
            uen: req.body.uen,
            businessName: req.body.businessName,
            businessCategory: req.body.businessCategory,
            description: req.body.description,
            address: req.body.address,
            latitude: req.body.latitude,
            longitude: req.body.longitude,
            open247: req.body.open247 ? 1 : 0,
            openingHours: req.body.openingHours, 
            email: req.body.email,
            phoneNumber: req.body.phoneNumber,
            websiteLink: req.body.websiteLink ?? '',
            socialMediaLink: req.body.socialMediaLink ?? '',
            wallpaper: req.body.wallpaper,
            dateOfCreation: req.body.dateOfCreation,
            priceTier: req.body.priceTier,
            offersDelivery: req.body.offersDelivery ? 1 : 0,
            offersPickup: req.body.offersPickup ? 1 : 0,
            paymentOptions: req.body.paymentOptions
        }

        const emailInfo = {
            uen: business.uen,
            businessName: business.businessName,
            businessCategory: business.businessCategory,
            address: business.address
        }

        try {
            const registrationResult = await BusinessModel.registerBusiness(business)

            // only send email if the insert is successful
            const ownerEmail = (await UserModel.getUserById(business.ownerId)).profile!.email
            const subject = 'Your Listing is Live!'
            const htmlBody = generateNewBusinessListingEmail(emailInfo)
            const emailSent = await sendEmail(ownerEmail, subject, htmlBody)

            res.status(200).json({
                success: true,
                message: 'business registered',
                registrationResult: registrationResult,
                emailSent: emailSent
            });
        }
        catch (err:any) {
            console.error(`There was a problem registering the selected business: ${err}`)

            // Parse MySQL error for better frontend messages
            let errorMessage = 'Failed to register business';
            if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
                if (err.sqlMessage?.includes('PRIMARY')) {
                    errorMessage = 'This UEN is already registered';
                } else {
                    errorMessage = 'Duplicate entry detected';
                }
            }

            res.status(400).json({ error: errorMessage });
        }
    }

    static async updateBusiness(req: Request, res: Response, next: NextFunction): Promise<void> {

        // Get the owner ID from the request
        const ownerId = req.body.ownerID || req.body.ownerId || req.body.id;

        if (!ownerId) {
            res.status(400).json({ error: 'Owner ID is required for business update' });
            return;
        }

        try {
            // Look up the business by ownerId to get the UEN
            const existingBusiness = await BusinessModel.getBusinessByOwnerId(ownerId);

            if (!existingBusiness) {
                res.status(404).json({ error: 'Business not found for this owner' });
                return;
            }

            // Use the existing UEN
            const business = {
                ownerID: ownerId,
                uen: existingBusiness.uen,  // Use the existing UEN from database
                businessName: req.body.businessName,
                businessCategory: req.body.businessCategory || req.body.category,
                description: req.body.description,
                address: req.body.address,
                latitude: req.body.latitude || null,
                longitude: req.body.longitude || null,
                open247: req.body.open247 ? 1 : 0,
                openingHours: req.body.openingHours,
                email: req.body.email || req.body.businessEmail,
                phoneNumber: req.body.phoneNumber || req.body.phone,
                websiteLink: req.body.websiteLink || req.body.website || '',
                socialMediaLink: req.body.socialMediaLink || req.body.socialMedia || '',
                wallpaper: req.body.wallpaper,
                priceTier: req.body.priceTier,
                offersDelivery: req.body.offersDelivery ? 1 : 0,
                offersPickup: req.body.offersPickup ? 1 : 0,
                paymentOptions: req.body.paymentOptions
            }

            await BusinessModel.updateBusiness(business)

            // Fetch the updated business to return it
            const updatedBusiness = await BusinessModel.getBusinessByUEN(business.uen);

            if (!updatedBusiness) {
                res.status(404).json({ error: 'Business not found after update' });
                return;
            }

            // Map backend field names to frontend BusinessOwner format
            const frontendBusiness = {
                ownerId: updatedBusiness.ownerId,
                uen: updatedBusiness.uen,
                businessName: updatedBusiness.businessName,
                role: 'business_owner' as const,
                address: updatedBusiness.address,
                latitude: updatedBusiness.latitude,
                longitude: updatedBusiness.longitude,
                operatingDays: Object.keys(updatedBusiness.openingHours),
                businessEmail: updatedBusiness.email,
                phone: updatedBusiness.phoneNumber,
                website: updatedBusiness.websiteLink || '',
                socialMedia: updatedBusiness.socialMediaLink || '',
                wallpaper: updatedBusiness.wallpaper,
                priceTier: updatedBusiness.priceTier,
                offersDelivery: Boolean(updatedBusiness.offersDelivery),
                offersPickup: Boolean(updatedBusiness.offersPickup),
                open247: Boolean(updatedBusiness.open247),
                paymentOptions: updatedBusiness.paymentOptions,
                category: updatedBusiness.businessCategory,
                description: updatedBusiness.description,
                openingHours: updatedBusiness.openingHours
            };

            res.status(200).json({
                message: 'business updated',
                business: frontendBusiness
            });
        }
        catch (err:any) {
            console.error(`There was a problem updating the selected business: ${err}`)
            next(err)
        }
    }

    static async deleteBusiness(req: Request, res: Response, next: NextFunction): Promise<void> {

        const uen = String(req.body.uen)

        try {
            await BusinessModel.deleteBusiness(uen)
            res.status(200).json({ message: 'business deleted' });
        }
        catch (err:any) {
            console.error(`There was a problem deleting the selected business: ${err}`)
            next(err)
        }
    }

    static async checkUenAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const uen = String(req.query.uen || '');
            if (!uen) {
                res.status(400).json({ error: 'UEN is required' });
                return;
            }

            const exists = await BusinessModel.checkUenExists(uen);
            res.json({ available: !exists });
        } catch (error) {
            console.error('Error checking UEN:', error);
            next(error);
        }
    }
}

export default businessController