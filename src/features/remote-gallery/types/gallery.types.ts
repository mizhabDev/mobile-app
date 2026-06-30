// ─── Photo Metadata ───────────────────────────────────────────────────────────

export type GalleryPhoto = {
  id: string;
  name: string;
  timestamp: number; // Unix ms
  width: number;
  height: number;
  size: number; // bytes
  uri: string; // local asset URI (Phone A only); empty string on Phone B
};

// ─── Protocol Messages ────────────────────────────────────────────────────────

export type ListReqMessage = {
  type: 'LIST_REQ';
  page: number;
  pageSize: number;
};

export type ListResMessage = {
  type: 'LIST_RES';
  total: number;
  page: number;
  photos: GalleryPhoto[];
};

export type ThumbReqMessage = {
  type: 'THUMB_REQ';
  id: string;
};

export type ThumbResMessage = {
  type: 'THUMB_RES';
  id: string;
  length: number; // byte length of following binary frame
  mimeType: 'image/jpeg';
};

export type FullReqMessage = {
  type: 'FULL_REQ';
  id: string;
};

export type FullResMessage = {
  type: 'FULL_RES';
  id: string;
  length: number;
  mimeType: 'image/jpeg';
};

export type NewPhotoMessage = {
  type: 'NEW_PHOTO';
  photo: GalleryPhoto;
};

export type PingMessage = { type: 'PING' };
export type PongMessage = { type: 'PONG' };

export type ViewerConnectedMessage = {
  type: 'VIEWER_CONNECTED';
  viewerCount: number;
};

export type ViewerDisconnectedMessage = {
  type: 'VIEWER_DISCONNECTED';
  viewerCount: number;
};

export type SocketMessage =
  | ListReqMessage
  | ListResMessage
  | ThumbReqMessage
  | ThumbResMessage
  | FullReqMessage
  | FullResMessage
  | NewPhotoMessage
  | PingMessage
  | PongMessage
  | ViewerConnectedMessage
  | ViewerDisconnectedMessage;

// ─── Connection State ─────────────────────────────────────────────────────────

export type GalleryConnectionState =
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected';

// ─── Gallery State (Phone B) ──────────────────────────────────────────────────

export type ThumbnailMap = Record<string, string>; // photoId → base64 jpeg data URI

export type GalleryState = {
  connectionState: GalleryConnectionState;
  photos: GalleryPhoto[];
  totalPhotos: number;
  currentPage: number;
  hasMore: boolean;
  thumbnails: ThumbnailMap;
  fullImages: ThumbnailMap; // photoId → full base64 data URI
  isLoadingPage: boolean;
};
