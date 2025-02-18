const { createHash } = require("crypto");

const lobbies = require("../util/lobbies.js");
const api_users = require("./users.js");

/**
 * Handles `/api/lobbies/` endpoint requests. This endpoint supports the following commands:
 *
 * - `list`: List all lobbies.
 * - `create`: Create a new lobby.
 * - `join`: Join an existing lobby.
 * - `secure`: Check if a lobby is password-protected.
 * - `get`: Get a lobby's data.
 * - `rename`: Rename a lobby.
 * - `password`: Set a lobby's password.
 *
 * @param {string[]} args The arguments for the api request
 * @param {HttpRequest} request The http request object
 * @returns {string|object|boolean} The response of the api request
 */
module.exports = async function (args, request) {

  const [command, name, password] = args;

  switch (command) {

    case "list": {

      // Fetch and return the list of lobbies
      return await lobbies(["list"]);

    }

    case "create": {

      // Get the active user and throw ERR_LOGIN if not logged in
      const user = await api_users(["whoami"], request);
      if (!user) return "ERR_LOGIN";

      // Create a new lobby with the specified name and password
      await lobbies(["create", name, password]);

      // Join the newly created lobby
      const hashedPassword = createHash("sha256").update(password).digest("base64");
      await lobbies(["join", name, hashedPassword, user.steamid]);

      return "SUCCESS";

    }

    case "join": {

      // Get the active user and throw ERR_LOGIN if not logged in
      const user = await api_users(["whoami"], request);
      if (!user) return "ERR_LOGIN";

      // Join the specified lobby with the specified password
      if (password) {
        const hashedPassword = createHash("sha256").update(password).digest("base64");
        await lobbies(["join", name, hashedPassword, user.steamid]);
      } else {
        await lobbies(["join", name, false, user.steamid]);
      }

      return "SUCCESS";

    }

    case "secure": {

      // Check if the specified lobby is password-protected
      const password = (await lobbies(["getdata", name])).password;

      if (password) return true;
      return false;

    }

    case "get": {

      // Get the active user and throw ERR_LOGIN if not logged in
      const user = await api_users(["whoami"], request);
      if (!user) return "ERR_LOGIN";

      // Get the specified lobby's list entry and data. Throw ERR_PERMS if the user is not in the lobby
      const listEntry = await lobbies(["get", name]);
      if (!listEntry.players.includes(user.steamid)) return "ERR_PERMS";

      const data = await lobbies(["getdata", name]);

      return { listEntry, data };

    }

    case "rename": {

      const newName = args[2];

      // Get the active user and throw ERR_LOGIN if not logged in
      const user = await api_users(["whoami"], request);
      if (!user) return "ERR_LOGIN";

      // Get the specified lobby's list entry and throw ERR_PERMS if the user is not in the lobby
      const listEntry = await lobbies(["get", name]);
      if (!listEntry.players.includes(user.steamid)) return "ERR_PERMS";

      // Rename the specified lobby
      return lobbies(["rename", name, newName]);

    }

    case "password": {

      // Get the active user and throw ERR_LOGIN if not logged in
      const user = await api_users(["whoami"], request);
      if (!user) return "ERR_LOGIN";

      // Get the specified lobby's list entry and throw ERR_PERMS if the user is not in the lobby
      const listEntry = await lobbies(["get", name]);
      if (!listEntry.players.includes(user.steamid)) return "ERR_PERMS";

      // Set the specified lobby's password
      return lobbies(["password", name, password]);

    }

  }

  return "ERR_COMMAND";

};
