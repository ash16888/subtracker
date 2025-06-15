// Глобальный загрузчик Google Identity Services и Google APIs
let googleApisLoaded = false
let loadingPromise: Promise<void> | null = null

// Типы для Google APIs определены в types/google.d.ts

export const loadGoogleApis = (): Promise<void> => {
  if (googleApisLoaded) {
    return Promise.resolve()
  }

  if (loadingPromise) {
    return loadingPromise
  }

  loadingPromise = new Promise((resolve, reject) => {
    try {
      // Проверяем, не загружены ли уже скрипты
      const existingGsiScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]')
      const existingGapiScript = document.querySelector('script[src="https://apis.google.com/js/api.js"]')

      let gsiLoaded = !!existingGsiScript
      let gapiLoaded = !!existingGapiScript

      const checkBothLoaded = () => {
        if (gsiLoaded && gapiLoaded) {
          googleApisLoaded = true
          resolve()
        }
      }

      // Загружаем Google Identity Services
      if (!existingGsiScript) {
        const gisScript = document.createElement('script')
        gisScript.src = 'https://accounts.google.com/gsi/client'
        gisScript.async = true
        gisScript.defer = true
        
        gisScript.onload = () => {
          gsiLoaded = true
          checkBothLoaded()
        }
        
        gisScript.onerror = () => {
          reject(new Error('Failed to load Google Identity Services'))
        }
        
        document.body.appendChild(gisScript)
      } else {
        gsiLoaded = true
      }

      // Загружаем Google APIs
      if (!existingGapiScript) {
        const gapiScript = document.createElement('script')
        gapiScript.src = 'https://apis.google.com/js/api.js'
        gapiScript.async = true
        gapiScript.defer = true
        
        gapiScript.onload = () => {
          gapiLoaded = true
          checkBothLoaded()
        }
        
        gapiScript.onerror = () => {
          reject(new Error('Failed to load Google APIs'))
        }
        
        document.body.appendChild(gapiScript)
      } else {
        gapiLoaded = true
      }

      // Если оба скрипта уже были загружены
      checkBothLoaded()
    } catch (error) {
      reject(error)
    }
  })

  return loadingPromise
}

export const ensureGoogleApisLoaded = async (): Promise<boolean> => {
  try {
    await loadGoogleApis()
    return true
  } catch (error) {
    console.error('Failed to load Google APIs:', error)
    return false
  }
}