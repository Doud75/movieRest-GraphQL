export const GRAPHQL_SCHEMA = `#graphql

type User {
  userId: Int!             
  familyName: String
  givenName: String
  email: String!           
  files: [UserFile!]
}

type UserFile {
  fileId: Int!              
  userId: Int!
  storageKey: String!
  filename: String
  mimeType: String!     
}

type Film {
  film_id: Int!
  title: String!
  description: String
  release_year: Int
  actors: [Actor!]!
}

type Actor {
  actor_id: Int!
  first_name: String!
  last_name: String!
}

type Query {
  users: [User]
  user(userId: Int!): User
  films: [Film!]!
  film(film_id: Int!): Film
}

input UserDetails {
  familyName: String
  givenName: String
}

type Mutation {
  addUser(email: String!, familyName: String, givenName: String): User
  updateUser(userId: Int!, user: UserDetails!): User
  deleteUser(userId: Int!): Boolean
}
`
