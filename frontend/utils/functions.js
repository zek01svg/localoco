// THIS FUNCTION IS A HELPER FUNCTION THAT TAKES IN THE OPENING HRS AND THE OPEN247 BOOLEAN TO DISPLAY WHETHER A BUSINESS IS OPEN/CLOSED/OPEN247
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

// THIS FUNCTION TAKES IN A BUSINESS IN JSON FORM AND RETURNS A FORMATTED BOOTSTRAP CARD
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

    // assemble the card
    cardBody.append(title, desc, address, phone, status)
    cardDiv.append(img, cardBody)
    businessCard.appendChild(cardDiv)

    return businessCard
}

// THIS FUNCTION IS THE MAIN FUNCTION THAT DISPLAYS THE CARDS
function displayAndFilterBusinessses() {
    if (Object.keys(filters).length == 0) {
        
        axios.get(url)
        .then(response => {
            // console.log(response.data)
            for (let business of response.data) {
                
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