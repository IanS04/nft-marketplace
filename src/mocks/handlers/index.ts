import { realtimeHandlers } from '../realtime/socket-handler'
import { authHandlers } from './auth'
import { cartHandlers } from './cart'
import { creatorHandlers } from './creators'
import { favoriteHandlers } from './favorites'
import { memberHandlers } from './member'
import { nftHandlers } from './nfts'
import { orderHandlers } from './orders'
import { profileHandlers } from './profile'
import { walletHandlers } from './wallets'

export const handlers = [
  ...authHandlers,
  ...nftHandlers,
  ...creatorHandlers,
  ...favoriteHandlers,
  ...cartHandlers,
  ...walletHandlers,
  ...profileHandlers,
  ...orderHandlers,
  ...memberHandlers,
  ...realtimeHandlers,
]
