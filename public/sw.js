self.addEventListener('push', event => {
  if (!event.data) return

  const data = event.data.json()
  const options = {
    body: data.body,
    icon: '/brand/app-icon-192.png',
    badge: '/brand/app-icon-192.png',
    data: { url: data.url || '/' },
  }

  event.waitUntil(self.registration.showNotification(data.title || 'Mile Marker', options))
})

self.addEventListener('notificationclick', event => {
  event.notification.close()

  const destination = new URL(event.notification.data?.url || '/', self.location.origin).href

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      for (const client of clients) {
        if ('navigate' in client) {
          return client.navigate(destination).then(() => client.focus())
        }
      }

      return self.clients.openWindow(destination)
    })
  )
})
