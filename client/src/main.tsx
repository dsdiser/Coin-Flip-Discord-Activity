// filepath: client/src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import rocketLogo from "/rocket.png";
import "./style.css";
import { DiscordContextProvider, useDiscordSdk, Status } from "./hooks/useDiscordSdk";
import { useEffect, useState } from "react";

const AppInner: React.FC = () => {
  const { discordSdk, status } = useDiscordSdk();
  const [channelName, setChannelName] = useState<string>("Unknown");

  async function fetchChannelName() {
    let activityChannelName = "Unknown";
    if (discordSdk?.channelId != null && discordSdk?.guildId != null) {
      const channel = await discordSdk.commands.getChannel({ channel_id: discordSdk.channelId });
      if (channel.name) {
        activityChannelName = channel.name;
      }
    }
    setChannelName(activityChannelName);
  }

  useEffect(() => {
    if (status === Status.Authenticated || status === Status.Ready) {
      fetchChannelName();
    }
  }, [status, discordSdk]);

  return (
    <div id="app">
      <img src={rocketLogo} alt="Rocket Logo" />
      <h1>Coin Flip Discord Activity</h1>
      <p>Activity Channel: "{channelName}"</p>
      {status !== Status.Authenticated && <p>Loading Discord SDK...</p>}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <DiscordContextProvider authenticate={true} scope={["identify", "guilds", "guilds.members.read"]}>
      <AppInner />
    </DiscordContextProvider>
  );
};

const root = ReactDOM.createRoot(document.getElementById("app")!);
root.render(<App />);
