import React from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Printer } from 'lucide-react';

const testScenarios = [
  {
    category: "User Authentication & Onboarding",
    tests: [
      {
        id: "TC001",
        title: "New user completes onboarding flow",
        prerequisites: "App installed, no existing account",
        steps: [
          "Open app for the first time",
          "Log in with email/credentials",
          "Enter display name (e.g., 'TestUser123')",
          "Allow location permission when prompted",
          "Verify home location is set correctly",
          "Click 'Start Adventure' button"
        ],
        expected: "User lands on Home page with empty Flikkables list and 0 stamps"
      },
      {
        id: "TC002",
        title: "User sets display name and home location",
        prerequisites: "Onboarding page loaded",
        steps: [
          "Enter display name in the input field",
          "Verify character count updates",
          "Check that location is automatically detected",
          "Verify location name shows city/country",
          "Click 'Start Adventure'"
        ],
        expected: "Display name saved, home location set to current coordinates"
      },
      {
        id: "TC003",
        title: "User logs out and logs back in",
        prerequisites: "User is logged in",
        steps: [
          "Click user profile icon in top-right header",
          "Click 'Logout' from dropdown menu",
          "Verify redirect to login page",
          "Log back in with same credentials",
          "Verify user data persists (stamps, Flikkables, etc.)"
        ],
        expected: "Session ends on logout, all data restored on login"
      },
      {
        id: "TC004",
        title: "Admin vs regular user role verification",
        prerequisites: "Both admin and regular user accounts",
        steps: [
          "Log in as regular user",
          "Verify 'Admin' tab is NOT visible in bottom nav",
          "Log out and log in as admin user",
          "Verify 'Admin' tab IS visible in bottom nav",
          "Click Admin tab and verify access granted"
        ],
        expected: "Admin tab only visible to admin users"
      }
    ]
  },
  {
    category: "Creating Flikkables",
    tests: [
      {
        id: "TC005",
        title: "Create Flikkable with valid name and emoji",
        prerequisites: "User logged in, on Home page",
        steps: [
          "Click floating '+' button (bottom-right)",
          "Enter valid name (e.g., 'Buddy')",
          "Select an emoji avatar from the grid",
          "Click 'Create Flikkable' button",
          "Wait for creation to complete"
        ],
        expected: "New Flikkable appears in 'At Home' tab with random rarity assigned"
      },
      {
        id: "TC006",
        title: "Create Flikkable with profanity in name",
        prerequisites: "Create modal open",
        steps: [
          "Enter profane word in name field (e.g., 'BadWord')",
          "Try to click 'Create Flikkable' button",
          "Verify error message appears"
        ],
        expected: "Profanity filter blocks creation, shows error message"
      },
      {
        id: "TC007",
        title: "Create multiple Flikkables",
        prerequisites: "User has 0 Flikkables",
        steps: [
          "Create first Flikkable (name: 'Flick1')",
          "Create second Flikkable (name: 'Flick2')",
          "Create third Flikkable (name: 'Flick3')",
          "Verify all three appear in 'At Home' tab"
        ],
        expected: "Multiple Flikkables created successfully, each with unique ID"
      },
      {
        id: "TC008",
        title: "Verify random rarity assignment",
        prerequisites: "Create modal open",
        steps: [
          "Create 10 Flikkables with different names",
          "Check rarity of each created Flikkable",
          "Note distribution: common, uncommon, rare, epic, legendary",
          "Verify mix of rarities (not all same)"
        ],
        expected: "Rarities distributed randomly across all 5 tiers"
      },
      {
        id: "TC009",
        title: "Delete Flikkable at home",
        prerequisites: "At least one Flikkable with status 'home'",
        steps: [
          "Navigate to Home page",
          "Find Flikkable in 'At Home' tab",
          "Click trash icon on the Flikkable card",
          "Confirm deletion in dialog",
          "Verify Flikkable removed from list"
        ],
        expected: "Flikkable deleted successfully, no longer visible"
      },
      {
        id: "TC010",
        title: "Cannot delete traveling Flikkable",
        prerequisites: "At least one Flikkable with status 'landed' or 'picked_up'",
        steps: [
          "Navigate to Home page",
          "Go to 'Traveling' tab",
          "Check traveling Flikkable card",
          "Verify trash icon is NOT present"
        ],
        expected: "Delete option not available for traveling Flikkables"
      }
    ]
  },
  {
    category: "Flicking/Sending Flikkables",
    tests: [
      {
        id: "TC011",
        title: "Flick to random city",
        prerequisites: "Flikkable at home, location enabled",
        steps: [
          "Click on Flikkable in 'At Home' tab to select it",
          "Verify FlickArea appears above tabs",
          "Drag the Flikkable and release (flick gesture)",
          "In target selector modal, stay on 'Random' tab",
          "Click 'Confirm' button",
          "Wait for flight animation to complete"
        ],
        expected: "Flikkable lands in random major city, moves to 'Traveling' tab, stamps earned"
      },
      {
        id: "TC012",
        title: "Flick to specific user's home",
        prerequisites: "At least 2 users exist in system",
        steps: [
          "Select Flikkable at home",
          "Flick to open target selector",
          "Switch to 'User' tab",
          "Search for another user by name/email",
          "Select user from results",
          "Click 'Confirm'",
          "Wait for animation"
        ],
        expected: "Flikkable lands at target user's home location"
      },
      {
        id: "TC013",
        title: "Flick to searched city",
        prerequisites: "Flikkable at home",
        steps: [
          "Select Flikkable and flick",
          "Switch to 'City' tab in target selector",
          "Type city name (e.g., 'Paris')",
          "Wait for search results",
          "Select city from results",
          "Confirm and wait for animation"
        ],
        expected: "Flikkable lands near searched city coordinates"
      },
      {
        id: "TC014",
        title: "Verify distance calculation",
        prerequisites: "Know your location and target city coordinates",
        steps: [
          "Note your current location",
          "Flick Flikkable to known distant city",
          "After landing, check 'Traveling' tab",
          "View Flikkable's total distance traveled",
          "Calculate expected distance using coordinates",
          "Compare calculated vs displayed distance"
        ],
        expected: "Distance matches haversine formula calculation (±1km tolerance)"
      },
      {
        id: "TC015",
        title: "Verify stamps earned after flick",
        prerequisites: "User has known stamp balance, Flikkable at home",
        steps: [
          "Note current stamp balance (e.g., 100)",
          "Note Flikkable rarity",
          "Flick Flikkable to major city (1M+ population)",
          "Wait for landing",
          "Check new stamp balance",
          "Calculate expected: 1 (city) + distance/1000 + 3 (pop bonus) + rarity bonus"
        ],
        expected: "Stamp balance increases by correct amount based on formula"
      },
      {
        id: "TC016",
        title: "Verify journey history recorded",
        prerequisites: "Flikkable has been flicked at least once",
        steps: [
          "View Flikkable in 'Traveling' tab",
          "Click on distance traveled stat",
          "View journey history modal",
          "Verify 'flicked' event is recorded",
          "Check event has: location, distance, timestamp, user"
        ],
        expected: "Journey history shows flick event with all details"
      },
      {
        id: "TC017",
        title: "Verify owner notification on landing",
        prerequisites: "Flick a Flikkable",
        steps: [
          "Flick Flikkable to distant city",
          "Wait for landing animation to complete",
          "Click notification bell icon (top-right)",
          "Find 'landed' notification",
          "Verify shows: Flikkable name, city, distance, stamps earned"
        ],
        expected: "Owner receives notification with landing details"
      },
      {
        id: "TC018",
        title: "Verify nearby users notification",
        prerequisites: "Two users within 10km of each other",
        steps: [
          "User A flicks Flikkable to land near User B's home",
          "Wait for landing",
          "Log in as User B",
          "Check notifications",
          "Verify User B received 'New Flikkable nearby' notification",
          "Check notification shows distance from User B's home"
        ],
        expected: "Users within 10km receive proximity notifications"
      }
    ]
  },
  {
    category: "Exploring & Picking Up",
    tests: [
      {
        id: "TC019",
        title: "View nearby Flikkables on map",
        prerequisites: "At least 1 landed Flikkable near user location",
        steps: [
          "Navigate to Explore page",
          "Ensure 'Nearby' tab is selected",
          "Allow location if prompted",
          "Wait for map to load",
          "Verify user location marker appears",
          "Verify nearby Flikkable markers appear",
          "Check 'Nearby Flikkables' list below map"
        ],
        expected: "Map shows user location and nearby Flikkables with correct positions"
      },
      {
        id: "TC020",
        title: "Pick up Flikkable within 50m range",
        prerequisites: "User within 50m of landed Flikkable (or mock location)",
        steps: [
          "Go to Explore > Nearby tab",
          "Find Flikkable on map within 50m",
          "Click on Flikkable marker or card",
          "Detail modal opens",
          "Verify 'Pick Up' button is enabled",
          "Click 'Pick Up' button",
          "Wait for pickup to complete"
        ],
        expected: "Flikkable status changes to 'picked_up', appears in 'Carrying' tab"
      },
      {
        id: "TC021",
        title: "Cannot pick up Flikkable beyond 50m",
        prerequisites: "Landed Flikkable more than 50m away",
        steps: [
          "Go to Explore > Nearby",
          "Click on distant Flikkable (>50m)",
          "Detail modal opens",
          "Check 'Pick Up' button",
          "Verify button is disabled with distance tooltip"
        ],
        expected: "'Pick Up' button disabled, shows distance requirement"
      },
      {
        id: "TC022",
        title: "View picked up Flikkable in Carrying tab",
        prerequisites: "User has picked up at least 1 Flikkable",
        steps: [
          "Pick up a Flikkable (TC020)",
          "Navigate to Explore page",
          "Click 'Carrying' tab",
          "Verify Flikkable appears in list",
          "Check shows owner information"
        ],
        expected: "Carrying tab lists all Flikkables user is currently carrying"
      },
      {
        id: "TC023",
        title: "View global map with all Flikkables",
        prerequisites: "Multiple Flikkables landed worldwide",
        steps: [
          "Go to Explore page",
          "Click 'Global' tab",
          "Wait for global map to load",
          "Zoom out to see multiple markers",
          "Verify Flikkables shown globally",
          "Click on distant Flikkable marker",
          "Check detail modal shows correctly"
        ],
        expected: "Global map displays all landed Flikkables regardless of distance"
      },
      {
        id: "TC024",
        title: "Verify owner receives pickup notification",
        prerequisites: "Two users, User B picks up User A's Flikkable",
        steps: [
          "User A flicks Flikkable to location near User B",
          "User B picks up the Flikkable",
          "Log in as User A",
          "Open notifications",
          "Find 'picked up' notification",
          "Verify shows: Flikkable name, picker name, location"
        ],
        expected: "Owner notified when someone picks up their Flikkable"
      },
      {
        id: "TC025",
        title: "Location permission denied handling",
        prerequisites: "Browser location permissions revoked",
        steps: [
          "Revoke location permission in browser settings",
          "Navigate to Explore > Nearby",
          "Verify error message appears",
          "Check 'Retry' button is shown",
          "Click 'Retry' and grant permission",
          "Verify location now works"
        ],
        expected: "App gracefully handles denied permissions with retry option"
      },
      {
        id: "TC026",
        title: "Map bounds update correctly",
        prerequisites: "Explore page with multiple Flikkables",
        steps: [
          "Go to Explore > Nearby",
          "Note Flikkables shown in list",
          "Drag/pan the map to new area",
          "Wait a moment for bounds to update",
          "Verify list updates to show only Flikkables in new view",
          "Zoom in/out and verify list updates"
        ],
        expected: "Flikkable list updates based on visible map area"
      },
      {
        id: "TC027",
        title: "Refresh location/recalibrate",
        prerequisites: "User on Explore > Nearby tab",
        steps: [
          "Note current location on map",
          "Click 'Recalibrate' button",
          "Verify button shows 'Refreshing...' state",
          "Wait for location update",
          "Check map center updates to new location",
          "Verify distances recalculate"
        ],
        expected: "Location refreshes, distances update accurately"
      }
    ]
  },
  {
    category: "Returning Flikkables",
    tests: [
      {
        id: "TC028",
        title: "Return own Flikkable after 8hr cooldown",
        prerequisites: "User's own Flikkable landed, 8+ hours elapsed",
        steps: [
          "Go to Home > Traveling tab",
          "Find own Flikkable with status 'landed'",
          "Click on the Flikkable",
          "In modal, verify 'Return Home' button enabled",
          "Click 'Return Home'",
          "Confirm in dialog",
          "Wait for return to complete"
        ],
        expected: "Flikkable returns home, appears in 'At Home' tab, no stamps earned"
      },
      {
        id: "TC029",
        title: "Cannot return own Flikkable before 8hr cooldown",
        prerequisites: "User's Flikkable landed less than 8 hours ago",
        steps: [
          "Go to Home > Traveling tab",
          "Click on recently landed Flikkable (<8hrs)",
          "Check return modal",
          "Verify countdown timer shows remaining hours",
          "Verify 'Return Home' button is disabled"
        ],
        expected: "Return blocked with countdown showing time remaining"
      },
      {
        id: "TC030",
        title: "Return another user's Flikkable (earn stamps)",
        prerequisites: "User carrying another user's Flikkable",
        steps: [
          "Pick up another user's Flikkable",
          "Go to Explore > Carrying tab",
          "Click on the Flikkable card",
          "Verify ReturnArea appears",
          "Drag Flikkable to return (flick gesture)",
          "Note current stamp balance before return",
          "Complete return",
          "Check new stamp balance"
        ],
        expected: "Flikkable returned to owner's home, user earns stamps based on rarity + distance/200km"
      },
      {
        id: "TC031",
        title: "Verify stamps calculation on return",
        prerequisites: "Carrying Flikkable to return",
        steps: [
          "Note Flikkable's: rarity, total distance traveled",
          "Note current stamp balance",
          "Calculate expected: distance/200 + rarity bonus (rare=5, epic=10, legendary=20)",
          "Return the Flikkable",
          "Check actual stamps earned",
          "Compare with expected calculation"
        ],
        expected: "Stamps earned match formula: ⌈distance/200⌉ + rarity_bonus"
      },
      {
        id: "TC032",
        title: "Verify distance added to character profile",
        prerequisites: "Flikkable at 1000km traveled, non-owner returns it",
        steps: [
          "Note Flikkable's current total distance (e.g., 1000km)",
          "Note distance from current location to home (e.g., 500km)",
          "Return the Flikkable as non-owner",
          "View Flikkable card after return",
          "Check new total distance",
          "Verify increased by return distance (1000 + 500 = 1500km)"
        ],
        expected: "Total distance increases when non-owner returns (owner returns don't add distance)"
      },
      {
        id: "TC033",
        title: "Owner receives return notification",
        prerequisites: "Another user returns your Flikkable",
        steps: [
          "User B returns User A's Flikkable",
          "Log in as User A (owner)",
          "Open notifications",
          "Find 'returned' notification",
          "Verify shows: Flikkable name, returner name, distance traveled"
        ],
        expected: "Owner notified with return details and returner identity"
      },
      {
        id: "TC034",
        title: "Return modal shows correct countdown",
        prerequisites: "Own Flikkable landed 5 hours ago",
        steps: [
          "Go to Home > Traveling tab",
          "Click on recently landed Flikkable",
          "Open return dialog",
          "Check countdown timer",
          "Verify shows '3h remaining' (8 - 5 = 3)",
          "Wait 1 minute and check timer updates"
        ],
        expected: "Countdown accurately shows remaining time until 8-hour cooldown expires"
      }
    ]
  },
  {
    category: "Trading System",
    tests: [
      {
        id: "TC035",
        title: "Create trade offer (Flikkable for Flikkable)",
        prerequisites: "User has at least 1 Flikkable at home, another user exists with Flikkable",
        steps: [
          "Go to Trade page",
          "Click 'Create New Trade' button",
          "Select 'Trade Flikkables' option",
          "Choose your Flikkable to offer",
          "Search for target user",
          "Select target user",
          "Choose their Flikkable you want",
          "Click 'Send Trade Offer'",
          "Verify offer appears in 'Outgoing' tab"
        ],
        expected: "Trade offer created and sent to target user"
      },
      {
        id: "TC036",
        title: "Create trade offer (Flikkable for stamps)",
        prerequisites: "User has Flikkable at home",
        steps: [
          "Go to Trade page",
          "Click 'Create New Trade'",
          "Select 'Trade for Stamps' option",
          "Choose your Flikkable to offer",
          "Enter stamp amount (e.g., 50)",
          "Search for and select target user",
          "Send trade offer",
          "Verify appears in 'Outgoing' tab"
        ],
        expected: "Trade offer created requesting stamps for Flikkable"
      },
      {
        id: "TC037",
        title: "Accept incoming trade",
        prerequisites: "User has received a trade offer",
        steps: [
          "Go to Trade page",
          "Check 'Incoming' tab shows badge count",
          "Click 'Incoming' tab",
          "Review trade offer details",
          "Verify you have required stamps/Flikkable",
          "Click 'Accept' button",
          "Confirm in dialog",
          "Wait for trade to process"
        ],
        expected: "Trade completed, items/stamps exchanged, both users notified"
      },
      {
        id: "TC038",
        title: "Decline incoming trade",
        prerequisites: "User has received a trade offer",
        steps: [
          "Go to Trade > Incoming tab",
          "Find trade offer",
          "Click 'Decline' button",
          "Confirm decline",
          "Verify offer removed from Incoming",
          "Other user receives decline notification"
        ],
        expected: "Trade declined, offer removed, sender notified"
      },
      {
        id: "TC039",
        title: "Cancel outgoing trade",
        prerequisites: "User has sent a trade offer (pending)",
        steps: [
          "Go to Trade > Outgoing tab",
          "Find pending trade offer",
          "Click 'Cancel' button",
          "Confirm cancellation",
          "Verify offer removed from Outgoing"
        ],
        expected: "Trade cancelled before acceptance, removed from both users' views"
      },
      {
        id: "TC040",
        title: "Verify stamp balance after trade",
        prerequisites: "Trade involving stamps",
        steps: [
          "Note both users' stamp balances",
          "Execute trade (User A: 50 stamps → User B: Flikkable)",
          "Check User A's balance (should decrease by 50)",
          "Check User B's balance (should increase by 50)",
          "Verify stamp transaction history"
        ],
        expected: "Stamp balances update correctly for both parties"
      },
      {
        id: "TC041",
        title: "Trade notification system",
        prerequisites: "Users engaged in trading",
        steps: [
          "User A sends trade offer to User B",
          "Log in as User B",
          "Check notifications for 'trade_received'",
          "User B accepts trade",
          "Log in as User A",
          "Check notifications for 'trade_accepted'"
        ],
        expected: "Both users receive appropriate trade notifications"
      },
      {
        id: "TC042",
        title: "Cannot trade traveling Flikkables",
        prerequisites: "User has both home and traveling Flikkables",
        steps: [
          "Go to Trade page",
          "Click 'Create New Trade'",
          "Try to select traveling Flikkable",
          "Verify only 'home' status Flikkables are selectable"
        ],
        expected: "Only Flikkables at home can be selected for trading"
      }
    ]
  },
  {
    category: "Stamps & Passport",
    tests: [
      {
        id: "TC043",
        title: "Earn stamps from flicking",
        prerequisites: "User has Flikkable, known stamp balance",
        steps: [
          "Note current stamp balance (e.g., 100)",
          "Flick rare Flikkable to major city 2000km away",
          "Calculate expected: 1 (city) + 2 (2000/1000) + 3 (pop) + 2 (rare) = 8",
          "After landing, check stamp balance",
          "Verify increased by expected amount"
        ],
        expected: "Stamps earned match formula on Home page display"
      },
      {
        id: "TC044",
        title: "Earn stamps from returning",
        prerequisites: "Carrying another user's Flikkable",
        steps: [
          "Note stamp balance",
          "Note Flikkable rarity and distance from home",
          "Return Flikkable",
          "Calculate expected stamps",
          "Verify balance increased correctly"
        ],
        expected: "Stamps earned and added to balance"
      },
      {
        id: "TC045",
        title: "Spend stamps in trade",
        prerequisites: "User has 100+ stamps, incoming trade requests stamps",
        steps: [
          "Note stamp balance (e.g., 150)",
          "Accept trade offering 50 stamps for Flikkable",
          "Check new balance (should be 100)",
          "Verify trade completes successfully"
        ],
        expected: "Stamps deducted, trade completes if sufficient balance"
      },
      {
        id: "TC046",
        title: "View stamp transaction history",
        prerequisites: "User has earned/spent stamps",
        steps: [
          "Check if stamp transaction view exists",
          "Navigate to passport/stamps page",
          "View transaction history",
          "Verify shows: type, amount, date, related character/user"
        ],
        expected: "Transaction history displays all stamp movements (if implemented)"
      },
      {
        id: "TC047",
        title: "Exchange trophy for stamps",
        prerequisites: "User has completed quest and claimed trophy",
        steps: [
          "Complete a quest (e.g., 'World Traveler')",
          "Claim trophy",
          "Go to Trophy Room",
          "Find trophy in collection",
          "Click 'Exchange for Stamps' button",
          "Confirm exchange",
          "Verify stamps added to balance"
        ],
        expected: "Trophy exchanged, stamps added (100-500 based on rarity)"
      }
    ]
  },
  {
    category: "Quests & Achievements",
    tests: [
      {
        id: "TC048",
        title: "Quest progress updates correctly",
        prerequisites: "User has active quests",
        steps: [
          "Check quest tracker on Home page",
          "Perform action related to quest (e.g., visit 3 cities)",
          "Refresh or revisit page",
          "Verify quest progress updated",
          "Check progress bar/count increases"
        ],
        expected: "Quest progress tracks actions in real-time"
      },
      {
        id: "TC049",
        title: "Complete quest and claim trophy",
        prerequisites: "Quest nearly complete (e.g., 9/10 cities)",
        steps: [
          "Perform final action to complete quest",
          "Verify quest shows as 'Completed'",
          "Click 'Claim Trophy' button",
          "Verify trophy added to inventory",
          "Check trophy appears in Trophy Room"
        ],
        expected: "Trophy awarded upon quest completion"
      },
      {
        id: "TC050",
        title: "View trophy room",
        prerequisites: "User has at least 1 trophy",
        steps: [
          "Navigate to Trophy Room page",
          "Verify trophies displayed in grid/list",
          "Check trophy shows: icon, name, description, rarity",
          "Verify exchanged trophies marked differently"
        ],
        expected: "Trophy Room displays all earned trophies with details"
      },
      {
        id: "TC051",
        title: "Multiple quest tracking",
        prerequisites: "User has 3+ active quests",
        steps: [
          "Perform action that affects multiple quests",
          "Example: Return a Flikkable (affects 'Homecoming' and 'Social Butterfly')",
          "Check quest tracker",
          "Verify both/all relevant quests updated"
        ],
        expected: "Single action can progress multiple quests simultaneously"
      }
    ]
  },
  {
    category: "Notifications",
    tests: [
      {
        id: "TC052",
        title: "Receive flick landed notification",
        prerequisites: "User flicks a Flikkable",
        steps: [
          "Flick Flikkable to distant city",
          "Wait for landing animation",
          "Check notification bell icon (should show badge)",
          "Click bell icon",
          "Find 'flick landed' notification",
          "Verify contains: Flikkable name, city, distance, stamps"
        ],
        expected: "Notification appears with complete landing details"
      },
      {
        id: "TC053",
        title: "Receive pickup notification",
        prerequisites: "Another user picks up your Flikkable",
        steps: [
          "Have User B pick up your Flikkable",
          "Check notifications",
          "Find pickup notification",
          "Verify shows: Flikkable name, picker name, location"
        ],
        expected: "Owner notified when Flikkable picked up"
      },
      {
        id: "TC054",
        title: "Receive return notification",
        prerequisites: "Someone returns your Flikkable",
        steps: [
          "Have User B return your Flikkable",
          "Check notifications",
          "Find return notification",
          "Verify shows: Flikkable name, returner name, distance"
        ],
        expected: "Owner notified with return details"
      },
      {
        id: "TC055",
        title: "Mark notification as read",
        prerequisites: "User has unread notifications",
        steps: [
          "Open notification menu",
          "Verify unread notifications have indicator",
          "Click on a notification",
          "Verify marked as read (visual change)",
          "Check badge count decreases"
        ],
        expected: "Notifications marked read when clicked, badge updates"
      },
      {
        id: "TC056",
        title: "Delete notification",
        prerequisites: "User has notifications",
        steps: [
          "Open notification menu",
          "Find notification",
          "Click delete/dismiss button",
          "Verify notification removed from list",
          "Verify doesn't reappear on refresh"
        ],
        expected: "Notification deleted permanently"
      }
    ]
  },
  {
    category: "Leaderboard & Rankings",
    tests: [
      {
        id: "TC057",
        title: "View global leaderboard",
        prerequisites: "Multiple users with activity",
        steps: [
          "Navigate to Ranks page",
          "Verify leaderboard loads with user rankings",
          "Check displays: rank, name, stamps, Flikkables",
          "Verify sorted by stamps (highest first)"
        ],
        expected: "Leaderboard shows all users ranked by stamps"
      },
      {
        id: "TC058",
        title: "User position updates after earning stamps",
        prerequisites: "User ranked #5, earns stamps",
        steps: [
          "Note current leaderboard position",
          "Earn significant stamps (return Flikkable)",
          "Refresh leaderboard",
          "Verify rank improved if stamps exceed higher-ranked user"
        ],
        expected: "Leaderboard updates in real-time or on refresh"
      }
    ]
  },
  {
    category: "Admin Functions",
    tests: [
      {
        id: "TC059",
        title: "Admin can view all users",
        prerequisites: "Logged in as admin",
        steps: [
          "Navigate to Admin tab",
          "Verify user list displayed",
          "Check shows: name, email, role, created date",
          "Verify all users visible"
        ],
        expected: "Admin sees complete user list"
      },
      {
        id: "TC060",
        title: "Admin can invite new user",
        prerequisites: "Admin user logged in",
        steps: [
          "Go to Admin page",
          "Enter new user email",
          "Select role (user/admin)",
          "Click 'Invite User' button",
          "Verify success message",
          "Check user receives invite email"
        ],
        expected: "Invitation sent, new user can register"
      }
    ]
  }
];

export default function TestScenarios() {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 via-white to-pink-50 print:bg-white">
      <div className="max-w-5xl mx-auto px-4 py-6 pb-24">
        {/* Header - Hide on print */}
        <div className="flex items-center justify-between mb-8 print:hidden">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Test Scenarios Catalogue</h1>
            <p className="text-sm text-gray-500 mt-1">Flikkable App - Comprehensive Test Scripts</p>
          </div>
          <Button onClick={handlePrint} className="bg-violet-600 hover:bg-violet-700">
            <Printer className="w-4 h-4 mr-2" />
            Print / Save as PDF
          </Button>
        </div>

        {/* Print Header - Show only on print */}
        <div className="hidden print:block mb-8 border-b-2 border-gray-800 pb-4">
          <h1 className="text-3xl font-bold text-gray-900">Flikkable App - Test Scenarios</h1>
          <p className="text-sm text-gray-600 mt-2">Total Scenarios: {testScenarios.reduce((acc, cat) => acc + cat.tests.length, 0)}</p>
          <p className="text-xs text-gray-500 mt-1">Generated: {new Date().toLocaleDateString()}</p>
        </div>

        {/* Stats Card - Hide on print */}
        <Card className="p-6 mb-8 bg-white/80 backdrop-blur border-0 shadow-lg print:hidden">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-3xl font-bold text-violet-600">
                {testScenarios.length}
              </p>
              <p className="text-sm text-gray-500 mt-1">Categories</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-pink-600">
                {testScenarios.reduce((acc, cat) => acc + cat.tests.length, 0)}
              </p>
              <p className="text-sm text-gray-500 mt-1">Test Cases</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-emerald-600">
                {testScenarios.reduce((acc, cat) => acc + cat.tests.reduce((sum, test) => sum + test.steps.length, 0), 0)}
              </p>
              <p className="text-sm text-gray-500 mt-1">Total Steps</p>
            </div>
          </div>
        </Card>

        {/* Test Scenarios */}
        <div className="space-y-8">
          {testScenarios.map((category, catIdx) => (
            <div key={catIdx} className="print:break-inside-avoid">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-violet-200 print:border-gray-800">
                {category.category}
              </h2>
              <div className="space-y-6">
                {category.tests.map((test, testIdx) => (
                  <Card key={testIdx} className="p-6 bg-white border border-gray-200 print:border-2 print:border-gray-800 print:shadow-none print:break-inside-avoid">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-16 h-16 rounded-lg bg-violet-100 flex items-center justify-center print:bg-gray-100">
                        <span className="text-lg font-bold text-violet-700 print:text-gray-900">{test.id}</span>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">{test.title}</h3>
                        
                        <div className="mb-3">
                          <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Prerequisites:</p>
                          <p className="text-sm text-gray-700">{test.prerequisites}</p>
                        </div>

                        <div className="mb-3">
                          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Test Steps:</p>
                          <ol className="list-decimal list-inside space-y-1.5">
                            {test.steps.map((step, stepIdx) => (
                              <li key={stepIdx} className="text-sm text-gray-700 leading-relaxed">
                                <span className="ml-2">{step}</span>
                              </li>
                            ))}
                          </ol>
                        </div>

                        <div className="mt-3 pt-3 border-t border-gray-100 print:border-gray-300">
                          <p className="text-xs font-semibold text-emerald-700 uppercase mb-1">Expected Result:</p>
                          <p className="text-sm text-gray-900 font-medium">{test.expected}</p>
                        </div>

                        {/* Test Status Boxes for manual testing */}
                        <div className="mt-4 pt-4 border-t border-gray-100 print:border-gray-300 flex gap-4">
                          <label className="flex items-center gap-2 text-sm">
                            <input type="checkbox" className="w-4 h-4" />
                            <span className="text-gray-600">✓ Pass</span>
                          </label>
                          <label className="flex items-center gap-2 text-sm">
                            <input type="checkbox" className="w-4 h-4" />
                            <span className="text-gray-600">✗ Fail</span>
                          </label>
                          <div className="flex-1 ml-4">
                            <span className="text-xs text-gray-500">Notes: </span>
                            <span className="text-xs text-gray-400">_________________________</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer for print */}
        <div className="hidden print:block mt-12 pt-6 border-t-2 border-gray-800 text-center">
          <p className="text-sm text-gray-600">
            Flikkable App Test Catalogue - Page <span className="page-number"></span>
          </p>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:block {
            display: block !important;
          }
          .print\\:break-inside-avoid {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          @page {
            margin: 1.5cm;
            size: A4;
          }
        }
      `}</style>
    </div>
  );
}