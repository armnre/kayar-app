// Local port of the generated platform client (upstream: `.zite/api.ts`).
// Each caller runs the matching endpoint module in-process — see `./caller.ts`.
import { createCaller, registerEndpoints } from "./caller";

import adminAnnouncementsEp from "@/api/adminAnnouncements";
import adminAuditEp from "@/api/adminAudit";
import adminCmsEp from "@/api/adminCms";
import adminCollectionsEp from "@/api/adminCollections";
import adminDashboardEp from "@/api/adminDashboard";
import adminMediaEp from "@/api/adminMedia";
import adminMemberActionEp from "@/api/adminMemberAction";
import adminMemberBulkEp from "@/api/adminMemberBulk";
import adminMemberCreateEp from "@/api/adminMemberCreate";
import adminMembersEp from "@/api/adminMembers";
import adminPostsEp from "@/api/adminPosts";
import adminSettingsEp from "@/api/adminSettings";
import adminTracksEp from "@/api/adminTracks";
import appLibraryEp from "@/api/appLibrary";
import appNotificationsEp from "@/api/appNotifications";
import authChangePasswordEp from "@/api/authChangePassword";
import authLoginEp from "@/api/authLogin";
import authLogoutEp from "@/api/authLogout";
import authMeEp from "@/api/authMe";
import aiHealthEp from "@/api/aiHealth";
import authSessionsEp from "@/api/authSessions";
import bodyyarAiEp from "@/api/bodyyarAi";
import kapooshProductsEp from "@/api/kapooshProducts";
import morshedTracksEp from "@/api/morshedTracks";
import publicCmsEp from "@/api/publicCms";
import publicPostsEp from "@/api/publicPosts";
import publicSettingsEp from "@/api/publicSettings";

type Out<E> = E extends { execute: (args: any) => infer R } ? Awaited<R> : never;
type In<E> = E extends { execute: (args: infer A) => any } ? (A extends { input: infer I } ? I : any) : any;

export const endpoints = {
  adminAnnouncements: adminAnnouncementsEp,
  adminAudit: adminAuditEp,
  adminCms: adminCmsEp,
  adminCollections: adminCollectionsEp,
  adminDashboard: adminDashboardEp,
  adminMedia: adminMediaEp,
  adminMemberAction: adminMemberActionEp,
  adminMemberBulk: adminMemberBulkEp,
  adminMemberCreate: adminMemberCreateEp,
  adminMembers: adminMembersEp,
  adminPosts: adminPostsEp,
  adminSettings: adminSettingsEp,
  adminTracks: adminTracksEp,
  appLibrary: appLibraryEp,
  appNotifications: appNotificationsEp,
  authChangePassword: authChangePasswordEp,
  authLogin: authLoginEp,
  authLogout: authLogoutEp,
  authMe: authMeEp,
  authSessions: authSessionsEp,
  aiHealth: aiHealthEp,
  bodyyarAi: bodyyarAiEp,
  kapooshProducts: kapooshProductsEp,
  morshedTracks: morshedTracksEp,
  publicCms: publicCmsEp,
  publicPosts: publicPostsEp,
  publicSettings: publicSettingsEp,
};
registerEndpoints(endpoints);

export type AdminAnnouncementsInputType = In<typeof adminAnnouncementsEp>;
export type AdminAnnouncementsOutputType = Out<typeof adminAnnouncementsEp>;
export const adminAnnouncements = createCaller<AdminAnnouncementsInputType, AdminAnnouncementsOutputType>("adminAnnouncements");

export type AdminAuditInputType = In<typeof adminAuditEp>;
export type AdminAuditOutputType = Out<typeof adminAuditEp>;
export const adminAudit = createCaller<AdminAuditInputType, AdminAuditOutputType>("adminAudit");

export type AdminCmsInputType = In<typeof adminCmsEp>;
export type AdminCmsOutputType = Out<typeof adminCmsEp>;
export const adminCms = createCaller<AdminCmsInputType, AdminCmsOutputType>("adminCms");

export type AdminCollectionsInputType = In<typeof adminCollectionsEp>;
export type AdminCollectionsOutputType = Out<typeof adminCollectionsEp>;
export const adminCollections = createCaller<AdminCollectionsInputType, AdminCollectionsOutputType>("adminCollections");

export type AdminDashboardInputType = In<typeof adminDashboardEp>;
export type AdminDashboardOutputType = Out<typeof adminDashboardEp>;
export const adminDashboard = createCaller<AdminDashboardInputType, AdminDashboardOutputType>("adminDashboard");

export type AdminMediaInputType = In<typeof adminMediaEp>;
export type AdminMediaOutputType = Out<typeof adminMediaEp>;
export const adminMedia = createCaller<AdminMediaInputType, AdminMediaOutputType>("adminMedia");

export type AdminMemberActionInputType = In<typeof adminMemberActionEp>;
export type AdminMemberActionOutputType = Out<typeof adminMemberActionEp>;
export const adminMemberAction = createCaller<AdminMemberActionInputType, AdminMemberActionOutputType>("adminMemberAction");

export type AdminMemberBulkInputType = In<typeof adminMemberBulkEp>;
export type AdminMemberBulkOutputType = Out<typeof adminMemberBulkEp>;
export const adminMemberBulk = createCaller<AdminMemberBulkInputType, AdminMemberBulkOutputType>("adminMemberBulk");

export type AdminMemberCreateInputType = In<typeof adminMemberCreateEp>;
export type AdminMemberCreateOutputType = Out<typeof adminMemberCreateEp>;
export const adminMemberCreate = createCaller<AdminMemberCreateInputType, AdminMemberCreateOutputType>("adminMemberCreate");

export type AdminMembersInputType = In<typeof adminMembersEp>;
export type AdminMembersOutputType = Out<typeof adminMembersEp>;
export const adminMembers = createCaller<AdminMembersInputType, AdminMembersOutputType>("adminMembers");

export type AdminPostsInputType = In<typeof adminPostsEp>;
export type AdminPostsOutputType = Out<typeof adminPostsEp>;
export const adminPosts = createCaller<AdminPostsInputType, AdminPostsOutputType>("adminPosts");

export type AdminSettingsInputType = In<typeof adminSettingsEp>;
export type AdminSettingsOutputType = Out<typeof adminSettingsEp>;
export const adminSettings = createCaller<AdminSettingsInputType, AdminSettingsOutputType>("adminSettings");

export type AdminTracksInputType = In<typeof adminTracksEp>;
export type AdminTracksOutputType = Out<typeof adminTracksEp>;
export const adminTracks = createCaller<AdminTracksInputType, AdminTracksOutputType>("adminTracks");

export type AppLibraryInputType = In<typeof appLibraryEp>;
export type AppLibraryOutputType = Out<typeof appLibraryEp>;
export const appLibrary = createCaller<AppLibraryInputType, AppLibraryOutputType>("appLibrary");

export type AppNotificationsInputType = In<typeof appNotificationsEp>;
export type AppNotificationsOutputType = Out<typeof appNotificationsEp>;
export const appNotifications = createCaller<AppNotificationsInputType, AppNotificationsOutputType>("appNotifications");

export type AuthChangePasswordInputType = In<typeof authChangePasswordEp>;
export type AuthChangePasswordOutputType = Out<typeof authChangePasswordEp>;
export const authChangePassword = createCaller<AuthChangePasswordInputType, AuthChangePasswordOutputType>("authChangePassword");

export type AuthLoginInputType = In<typeof authLoginEp>;
export type AuthLoginOutputType = Out<typeof authLoginEp>;
export const authLogin = createCaller<AuthLoginInputType, AuthLoginOutputType>("authLogin");

export type AuthLogoutInputType = In<typeof authLogoutEp>;
export type AuthLogoutOutputType = Out<typeof authLogoutEp>;
export const authLogout = createCaller<AuthLogoutInputType, AuthLogoutOutputType>("authLogout");

export type AuthMeInputType = In<typeof authMeEp>;
export type AuthMeOutputType = Out<typeof authMeEp>;
export const authMe = createCaller<AuthMeInputType, AuthMeOutputType>("authMe");

export type AiHealthInputType = In<typeof aiHealthEp>;
export type AiHealthOutputType = Out<typeof aiHealthEp>;
export const aiHealth = createCaller<AiHealthInputType, AiHealthOutputType>("aiHealth");

export type AuthSessionsInputType = In<typeof authSessionsEp>;
export type AuthSessionsOutputType = Out<typeof authSessionsEp>;
export const authSessions = createCaller<AuthSessionsInputType, AuthSessionsOutputType>("authSessions");

export type BodyyarAiInputType = In<typeof bodyyarAiEp>;
export type BodyyarAiOutputType = Out<typeof bodyyarAiEp>;
export const bodyyarAi = createCaller<BodyyarAiInputType, BodyyarAiOutputType>("bodyyarAi");

export type KapooshProductsInputType = In<typeof kapooshProductsEp>;
export type KapooshProductsOutputType = Out<typeof kapooshProductsEp>;
export const kapooshProducts = createCaller<KapooshProductsInputType, KapooshProductsOutputType>("kapooshProducts");

export type MorshedTracksInputType = In<typeof morshedTracksEp>;
export type MorshedTracksOutputType = Out<typeof morshedTracksEp>;
export const morshedTracks = createCaller<MorshedTracksInputType, MorshedTracksOutputType>("morshedTracks");

export type PublicCmsInputType = In<typeof publicCmsEp>;
export type PublicCmsOutputType = Out<typeof publicCmsEp>;
export const publicCms = createCaller<PublicCmsInputType, PublicCmsOutputType>("publicCms");

export type PublicPostsInputType = In<typeof publicPostsEp>;
export type PublicPostsOutputType = Out<typeof publicPostsEp>;
export const publicPosts = createCaller<PublicPostsInputType, PublicPostsOutputType>("publicPosts");

export type PublicSettingsInputType = In<typeof publicSettingsEp>;
export type PublicSettingsOutputType = Out<typeof publicSettingsEp>;
export const publicSettings = createCaller<PublicSettingsInputType, PublicSettingsOutputType>("publicSettings");
