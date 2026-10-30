import TrackPlayer from "react-native-track-player";
import { RNTPService } from "@lib/RNTPService";

TrackPlayer.registerPlaybackService(() => RNTPService);

// Must run after registerPlaybackService — expo-router/entry bootstraps the
// RN app, and the playback service has to be registered before that happens.
// eslint-disable-next-line import/first
import "expo-router/entry";
