import React, { useEffect, useState } from "react";
/// <reference types="vite/client" />
import ReactDOM from "react-dom/client";
import { DiscordSDK } from "@discord/embedded-app-sdk";
import rocketLogo from "/rocket.png";
import "./style.css";
declare global {
  interface ImportMetaEnv {
    VITE_DISCORD_CLIENT_ID: string;
  }
  interface ImportMeta {
    env: ImportMetaEnv;
  }
}

const discordSdk = new DiscordSDK(import.meta.env.VITE_DISCORD_CLIENT_ID);

const App: React.FC = () => {
  const [channelName, setChannelName] = useState<string>("Unknown");
  const [sdkReady, setSdkReady] = useState<boolean>(false);

  async function setupDiscordSdk() {
    await discordSdk.ready();
    setSdkReady(true);
    // Authorize with Discord Client
    const { code } = await discordSdk.commands.authorize({
      client_id: import.meta.env.VITE_DISCORD_CLIENT_ID,
      response_type: "code",
      state: "",
      prompt: "none",
      scope: ["identify", "guilds", "guilds.members.read", "activities.read", "activities.write"]
    });
  }

  async function fetchChannelName() {
    let activityChannelName = "Unknown";
    if (discordSdk.channelId != null && discordSdk.guildId != null) {
      const channel = await discordSdk.commands.getChannel({ channel_id: discordSdk.channelId });
      if (channel.name) {
        activityChannelName = channel.name;
      }
    }
    setChannelName(activityChannelName);
  }

  useEffect(() => {
    if (sdkReady) {
      fetchChannelName();
    }
  }, [sdkReady]);

  useEffect(() => {
    setupDiscordSdk();
  }, []);

  return (
    <div id="app">
      <img src={rocketLogo} alt="Rocket Logo" />
      <h1>Coin Flip Discord Activity</h1>
      <p>Activity Channel: "{channelName}"</p>
      {!sdkReady && <p>Loading Discord SDK...</p>}
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById("app")!);
root.render(<App />);
