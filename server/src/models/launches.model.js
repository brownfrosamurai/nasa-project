const { default: axios } = require('axios')
const launches = require('./launches.mongo')
const planets = require('./planets.mongo')

const DEFAULT_FLIGHT_NUMBER = 100

const SPACEX_API_URL = 'https://api.spacexdata.com/v4/launches/query'

async function populateLaunches() {
    const response = await axios.post(SPACEX_API_URL, {
        query: {},
        options: {
            pagination: false,
            populate: [
                {
                    path: 'rocket',
                    select: {
                        name: 1
                    }
                },
                {
                    path: 'payloads',
                    select: {
                        customers: 1
                    }
                }
            ]
        }
    })

    if (response.status !== 200) {
        console.log('Problem downloading launch data')
        throw new Error('Launch data dowload failed')
    }

    const launchDocs = response.data.docs;

    for (const launchDoc of launchDocs) {
        const payloads = launchDoc['payloads']
        const customers = payloads.flatMap((payload) => {
            return payload['customers']
        })

        const launch = {
            flightNumber: launchDoc['flight_number'],
            mission: launchDoc['name'],
            rocket: launchDoc['rocket']['name'],
            launchDate: launchDoc['date_local'],
            upcoming: launchDoc['upcoming'],
            success: launchDoc['success'],
            customers
        }

        await saveLaunch(launch)
    }
}

async function loadLaunchesData() {
    const firstLaunch = await findLaunch({
        flightNumber: 1,
        rocket: 'Falcon 1',
        mission: 'FalconSat'
    })

    if (firstLaunch) {
        console.log('Launch data already loaded')
    } else {
        await populateLaunches()
    }
}

async function getAllLaunches(skip, limit) {
    return await launches
        .find({}, '-_id -__v')
        .sort({ flightNumber: 1 })
        .skip(skip)
        .limit(limit)
}

async function saveLaunch(launch) {
    await launches.findOneAndUpdate({
        flightNumber: launch.flightNumber
    }, launch, {
        upsert: true
    })
}

async function scheduleNewLaunch(launch) {
    const planet = await planets.findOne({
        keplerName: launch.target,
    })

    if (!planet) {
        throw new Error('No matching planet was found')
    }

    const newFlightNumber = await getLatestFlightNumber() + 1

    const newLaunch = Object.assign(launch, {
        flightNumber: newFlightNumber,
        customers: ['Zero To Mastery', 'NASA'],
        upcoming: true,
        success: true,
    })

    await saveLaunch(newLaunch)
}

async function findLaunch(filter) {
    return await launches.findOne(filter)
}

async function existsLaunchwithId(launchId) {
    return await findLaunch({
        flightNumber: launchId
    })
}

async function getLatestFlightNumber() {
    let latestLunch = await launches.findOne().sort('-flightNumber')

    if (!latestLunch) {
        return DEFAULT_FLIGHT_NUMBER
    }

    return latestLunch.flightNumber;
}

async function abortLaunchById(launchId) {
    const aborted = await launches.updateOne({
        flightNumber: launchId
    }, {
        upcoming: false,
        success: false
    })

    return aborted.modifiedCount === 1
}

module.exports = {
    loadLaunchesData,
    getAllLaunches,
    scheduleNewLaunch,
    existsLaunchwithId,
    abortLaunchById
}
