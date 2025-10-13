<?php
class Business {
    
    private $uen;
    private $password;
    private $businessName;
    private $businessCategory;
    private $description;
    private $address;
    private $open247;
    private $openingHours;
    private $email;
    private $phoneNumber;
    private $websiteLink;
    private $socialMediaLink;
    private $wallpaper;
    private $dateOfCreation;
    private $priceTier;
    private $offersDelivery;
    private $offersPickup;
    private $paymentOptions;

    public function __construct(
        $uen, $password, $businessName, $businessCategory, $description, $address, $open247, $openingHours,
        $email, $phoneNumber, $websiteLink, $socialMediaLink, $wallpaper,
        $dateOfCreation, $priceTier, $offersDelivery, $offersPickup, $paymentOptions
    ) {
        $this->uen = $uen;
        $this->password = $password;
        $this->businessName = $businessName;
        $this->businessCategory = $businessCategory;
        $this->description = $description;
        $this->address = $address;
        $this->open247 = $open247;
        $this->openingHours = $openingHours;
        $this->email = $email;
        $this->phoneNumber = $phoneNumber;
        $this->websiteLink = $websiteLink;
        $this->socialMediaLink = $socialMediaLink;
        $this->wallpaper = $wallpaper;
        $this->dateOfCreation = $dateOfCreation;
        $this->priceTier = $priceTier;
        $this->offersDelivery = $offersDelivery;
        $this->offersPickup = $offersPickup;
        $this->paymentOptions = $paymentOptions;
    }

    // GETTERS

    public function getUEN() {
        return $this->uen;
    }
    
    public function getPassword() {
        return $this->password;
    }
    
    public function getBusinessName() {
        return $this->businessName;
    }

    public function getBusinessCategory() {
        return $this->businessCategory;
    }

    public function getDescription() {
        return $this->description;
    }

    public function getAddress() {
        return $this->address;
    }

    public function isOpen247() {
        return $this->open247;
    }

    public function getOpeningHours() {
        return $this->openingHours;
    }

    public function getEmail() {
        return $this->email;
    }

    public function getPhoneNumber() {
        return $this->phoneNumber;
    }

    public function getWebsiteLink() {
        return $this->websiteLink;
    }

    public function getSocialMediaLink() {
        return $this->socialMediaLink;
    }

    public function getWallpaper() {
        return $this->wallpaper;
    }

    public function getDateOfCreation() {
        return $this->dateOfCreation;
    }

    public function getPriceTier() {
        return $this->priceTier;
    }

    public function getOffersDelivery() {
        return $this->offersDelivery;
    }

    public function getOffersPickup() {
        return $this->offersPickup;
    }

    public function getPaymentOptions() {
        return $this->paymentOptions;
    }


    // SETTERS

    public function setPassword($password) {
        $this->password = $password;
    }

    public function setDescription($description) {
        $this->description = $description;
    }

    public function setAddress($address) {
        $this->address = $address;
    }

    public function setOpeningHours($openingHours) {
        $this->openingHours = $openingHours;
    }

    public function setEmail($email) {
        $this->email = $email;
    }

    public function setPhoneNumber($phoneNumber) {
        $this->phoneNumber = $phoneNumber;
    }

    public function setWebsiteLink($websiteLink) {
        $this->websiteLink = $websiteLink;
    }

    public function setSocialMediaLink($socialMediaLink) {
        $this->socialMediaLink = $socialMediaLink;
    }

    public function setWallpaper($wallpaper) {
        $this->wallpaper = $wallpaper;
    }

    public function setPriceTier($priceTier) {
        $this->priceTier = $priceTier;
    }

    public function setOffersDelivery($offersDelivery) {
        $this->offersDelivery = $offersDelivery;
    }

    public function setOffersPickup($offersPickup) {
        $this->offersPickup = $offersPickup;
    }

    public function setPaymentOptions($paymentOptions) {
        $this->paymentOptions = $paymentOptions;
    }
}
?>
