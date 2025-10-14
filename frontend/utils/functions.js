/**
 * Determines the current open/closed status of a business.
 * @param {Object} dailyOpeningHours - Object containing opening and closing times for each day.
 * @param {boolean|number} open247 - Indicates if the business is open 24/7.
 * @returns {string} Status message like "Open", "Closed", or "Open 24/7".
 */
function displayOpenOrClosed(dailyOpeningHours, open247) {
    const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    const now = new Date()
    const dayToday = daysOfWeek[now.getDay()]

    if (open247 == 1) {
        return 'Open 24/7'
    } 
    // check if today is in opening hours
    else if (dailyOpeningHours[dayToday]) {
        const [openHour, openMinute] = dailyOpeningHours[dayToday]['open'].split(':').map(Number)
        const [closeHour, closeMinute] = dailyOpeningHours[dayToday]['close'].split(':').map(Number)

        const openingTime = new Date(now)
        openingTime.setHours(openHour, openMinute, 0, 0)

        const closingTime = new Date(now)
        closingTime.setHours(closeHour, closeMinute, 0, 0)

        if (now >= openingTime && now <= closingTime) {
            return `Open - Closes at ${closingTime.getHours().toString().padStart(2,'0')}:${closingTime.getMinutes().toString().padStart(2,'0')}`
        } else {
            return `Closed - Opens at ${openingTime.getHours().toString().padStart(2,'0')}:${openingTime.getMinutes().toString().padStart(2,'0')}`
        }
    } 
    // find next open day
    else {
        for (let i = 1; i <= 7; i++) {
            const nextDate = new Date(now)
            nextDate.setDate(now.getDate() + i)
            const nextDay = daysOfWeek[nextDate.getDay()]

            if (dailyOpeningHours[nextDay]) {
                const nextOpenTime = dailyOpeningHours[nextDay]['open']
                return `Closed - Opens on ${nextDay} at ${nextOpenTime}`
            }
        }
        return 'Closed for the week'
    }
}

/**
 * Converts a business JSON object into a Bootstrap card element
 * @param {Object} business - Business data
 * @returns {HTMLElement} A fully constructed Bootstrap card for the business
 */
function formatAsBootstrapCard(business) {
    // create the div element
    const businessCard = document.createElement('div')
    businessCard.className = 'col-md-4 mb-4'

    // create the card
    const cardDiv = document.createElement('div')
    cardDiv.className = 'card h-100 shadow-sm'

    // handle the image
    const img = document.createElement('img')
    img.src = '/backend/uploads/' + business.wallpaper
    img.className = 'card-img-top h-50 object-fit-cover'

    // create the card body
    const cardBody = document.createElement('div')
    cardBody.className = 'card-body'

    // handle the title
    const title = document.createElement('h5')
    title.className = 'card-title'
    title.textContent = business.business_name

    // handle the description
    const desc = document.createElement('p')
    desc.className = 'card-text'
    desc.textContent = business.description

    // handle the address
    const address = document.createElement('p')
    address.className = 'card-text'
    address.textContent = business.address

    // handle the number
    const phone = document.createElement('p')
    phone.className = 'card-text'
    phone.textContent = business.phone_number

    // handle the open/closed status
    const status = document.createElement('p')
    status.className = 'card-text'
    status.textContent = displayOpenOrClosed(business.opening_hours, business.open247)

    // add the view details button
    const viewDetailsButton = document.createElement('button')
    viewDetailsButton.className = 'btn btn-dark'
    viewDetailsButton.innerText = 'View Details'
    viewDetailsButton.addEventListener('click', () => {
        showDetails(business.uen)
    })

    // assemble the card
    cardBody.append(title, desc, address, phone, status, viewDetailsButton)
    cardDiv.append(img, cardBody)
    businessCard.appendChild(cardDiv)

    return businessCard
}

/**
 * Fetches businesses from the server and displays them as Bootstrap cards.
 * Applies filters if any are active.
 */
function displayAndFilterBusinessses() {
    if (Object.keys(filters).length == 0) {
        
        axios.get(url)
        .then(response => {
            // console.log(response.data)
            for (let business of response.data) {
                console.log(business)
                
                // format as a bootstrap card using the helper function
                business = formatAsBootstrapCard(business)

                // append to the container
                cardContainer.appendChild(business)
            }
        })
    }
    else if (Object.keys(filters).length != 0) {
        
        axios.get(url, {
            params: { filters: JSON.stringify(filters) }
        })
        .then(response => {
            console.log(response.data)
            // if got response returned from the endpoint, get rid of all the cards and replace with the response
            // else, display 'no matches found'
            
            cardContainer.replaceChildren() // remove all the cards from the container

            if (response.data.length == 0) {
                cardContainer.innerText = 'No matches found for your search query.'
            }
            else {
                for (let business of response.data) {
                    // format as a bootstrap card using the helper function
                    business = formatAsBootstrapCard(business)

                    // append to the container
                    cardContainer.appendChild(business)
                }
            }
        })
    }
}

/**
 * Creates a "View Details" button for a business card.
 * @returns {HTMLElement} Button element with click listener to show details.
 */
function createButton () {
    viewDetailsButton = document.createElement('button')
    viewDetailsButton.className = 'view-detials'
    viewDetailsButton.innerText = 'View Details'
    card.addEventListener('click', () => 
        showDetails(item.id));
    
    viewDetailsButton.addEventListener('click', () => {
        showDetails(item.id)
    })

    return viewDetailsButton
}

/**
 * Fetches and displays detailed information of a business.
 * Hides the main card list and filtering bar.
 * @param {string|number} id - Unique identifier of the business to display.
 */
function showDetails(id) {
    // get the elements
    const display_details_image = document.getElementById('display_details_image')
    const description = document.getElementById('description')
    const address = document.getElementById('address')
    const phone = document.getElementById('phone')
    const website_link = document.getElementById('website_link')
    const social_media_link = document.getElementById('social_media_link')
    const opening_hours = document.getElementById('opening_hours')
    const isOpen247 = document.getElementById('isOpen247')

    // get the containers
    const mainCardContainer = document.getElementById('cardContainer')
    const detailsContainer = document.getElementById('display_details')
    const filtering_bar = document.getElementById('filtering_bar')

    // clear previous opening hours
    opening_hours.innerHTML = ''

    axios.get(url, { params: { id: id } })
        .then(response => {
            if (response.data.error) {
                console.warn(response.data.error)
            } else {
                const business = response.data

                display_details_image.src = '/backend/uploads/' + business.wallpaper
                description.innerText = business.description
                address.innerHTML = `<strong>Address:</strong> ${business.address}`
                phone.innerHTML = `<strong>Phone:</strong> ${business.phone}`
                website_link.innerHTML = `<strong>Website:</strong> <a href="${business.website_link || '#'}" target="_blank">${business.website_link || '-'}</a>`
                social_media_link.innerHTML = `<strong>Social Media:</strong> <a href="${business.social_media_link || '#'}" target="_blank">${business.social_media_link || '-'}</a>`

                if (business.open247 == 1) {
                    // display open247
                    isOpen247.innerText = 'Open 24/7'
                }
                else {
                    for (const [day, times] of Object.entries(business.opening_hours || {})) {
                        const li = document.createElement('li')
                        li.innerText = `${day}: ${times.open} - ${times.close}`
                        opening_hours.appendChild(li)
                    }
                }
                
                // hide main cards and show details
                mainCardContainer.style.display = 'none'
                filtering_bar.style.display = 'none'
                detailsContainer.style.display = 'block'
            }
        });
}

/**
 * Closes the detailed business view and restores the main card list and filtering bar.
 */
function closeDetails() {
    const mainCardContainer = document.getElementById('cardContainer')
    const detailsContainer = document.getElementById('display_details')
    const opening_hours = document.getElementById('opening_hours')
    const filtering_bar = document.getElementById('filtering_bar')

    // hide details, show main cards
    detailsContainer.style.display = 'none'
    mainCardContainer.style.display = '';
    filtering_bar.style.display = ''

    opening_hours.innerHTML = ''
}