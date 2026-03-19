import { google } from "googleapis"

export type ContactMatch = {
  resourceName: string
  etag?: string
  name?: string
  email?: string
  phoneNumber?: string
}

export type ContactSearchResponse = {
  query: string
  results: ContactMatch[]
}

function normalize(value: string) {
  return value.toLowerCase().trim()
}

function scoreContact(contact: ContactMatch, query: string) {
  const normalizedQuery = normalize(query)
  const name = contact.name ? normalize(contact.name) : ""
  const email = contact.email ? normalize(contact.email) : ""
  const phoneNumber = contact.phoneNumber ? contact.phoneNumber.replace(/\D/g, "") : ""

  if (email === normalizedQuery || name === normalizedQuery) return 0
  if (email.startsWith(normalizedQuery) || name.startsWith(normalizedQuery)) return 1
  if (email.includes(normalizedQuery) || name.includes(normalizedQuery)) return 2

  const digitsOnlyQuery = query.replace(/\D/g, "")
  if (digitsOnlyQuery && phoneNumber.includes(digitsOnlyQuery)) return 3

  return Number.POSITIVE_INFINITY
}

export async function searchGoogleContacts(
  accessToken: string,
  query: string,
  pageSize = 100,
  maxResults = 10,
): Promise<ContactSearchResponse> {
  const oauth2Client = new google.auth.OAuth2()
  oauth2Client.setCredentials({ access_token: accessToken })

  const people = google.people({ version: "v1", auth: oauth2Client })

  const response = await people.people.connections.list({
    resourceName: "people/me",
    pageSize,
    personFields: "names,emailAddresses,phoneNumbers",
    sortOrder: "LAST_MODIFIED_DESCENDING",
  })

  const results = (response.data.connections ?? [])
    .flatMap((person) => {
      const name = person.names?.find((item) => item.displayName)?.displayName ?? undefined
      const phoneNumber = person.phoneNumbers?.find((item) => item.value)?.value ?? undefined

      return (person.emailAddresses ?? [{ value: undefined }]).map((emailAddress) => ({
        resourceName: person.resourceName ?? "",
        etag: person.etag ?? undefined,
        name,
        email: emailAddress.value ?? undefined,
        phoneNumber,
      }))
    })
    .filter((contact) => contact.resourceName)
    .map((contact) => ({
      ...contact,
      score: scoreContact(contact, query),
    }))
    .filter((contact) => Number.isFinite(contact.score))
    .sort(
      (a, b) =>
        a.score - b.score ||
        (a.name ?? "").localeCompare(b.name ?? "") ||
        (a.email ?? "").localeCompare(b.email ?? ""),
    )
    .slice(0, maxResults)
    .map((contact) => ({
      resourceName: contact.resourceName,
      etag: contact.etag,
      name: contact.name,
      email: contact.email,
      phoneNumber: contact.phoneNumber,
    }))

  return {
    query,
    results,
  }
}
