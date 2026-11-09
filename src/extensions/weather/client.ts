import { startShellClient } from '../../clients/runtime.js'
import Weather from './Weather.svelte'
import WeatherSettings from './WeatherSettings.svelte'

startShellClient({ card: Weather, settings: WeatherSettings })
