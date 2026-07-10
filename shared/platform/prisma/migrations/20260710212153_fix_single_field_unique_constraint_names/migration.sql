-- RenameIndex
ALTER INDEX "api_keys_key_hash_key" RENAME TO "uq_api_keys_key_hash";

-- RenameIndex
ALTER INDEX "invitations_token_hash_key" RENAME TO "uq_invitations_token_hash";

-- RenameIndex
ALTER INDEX "magic_link_tokens_token_hash_key" RENAME TO "uq_magic_link_tokens_token_hash";

-- RenameIndex
ALTER INDEX "password_reset_tokens_token_hash_key" RENAME TO "uq_password_reset_tokens_token_hash";

-- RenameIndex
ALTER INDEX "sessions_token_hash_key" RENAME TO "uq_sessions_token_hash";
