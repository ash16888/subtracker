// Глобальный загрузчик Google Identity Services
let googleIdentityLoaded = false
let loadingPromise: Promise<void> | null = null

export const loadGoogleApis = (): Promise<void> => {
  if (googleIdentityLoaded) {
    return Promise.resolve()
  }

  if (loadingPromise) {
    return loadingPromise
  }

  loadingPromise = new Promise((resolve, reject) => {
    try {
      // Проверяем, не загружен ли уже скрипт Google Identity Services
      const existingGsiScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]')

      if (existingGsiScript) {
        googleIdentityLoaded = true
        resolve()
        return
      }

      // Загружаем Google Identity Services
      const gisScript = document.createElement('script')
      gisScript.src = 'https://accounts.google.com/gsi/client'
      gisScript.async = true
      gisScript.defer = true
      
      gisScript.onload = () => {
        googleIdentityLoaded = true
        resolve()
      }
      
      gisScript.onerror = () => {
        reject(new Error('Failed to load Google Identity Services'))
      }
      
      document.body.appendChild(gisScript)
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
    console.error('Failed to load Google Identity Services:', error)
    return false
  }
}