# POST /players joins the leaderboard and returns the device token (only this once).
# PATCH /players/me updates the caller's row, found by their token.
class PlayersController < ApplicationController
  # Its own in-memory store, so the limit works in every environment (the default cache is off in development).
  RATE_LIMIT_STORE = ActiveSupport::Cache::MemoryStore.new
  rate_limit to: 10, within: 1.minute, store: RATE_LIMIT_STORE, only: %i[create update]

  def create
    player, token = Player.issue(name: params[:name], stamps: params[:stamps], tips_cents: params[:tipsCents])

    if token
      render json: { token: token, you: player.as_entry }, status: :created
    else
      render json: { error: error_code(player) }, status: :unprocessable_content
    end
  end

  def update
    player = current_player
    return render(json: { error: "unknown_player" }, status: :unauthorized) unless player

    if player.record_progress(stamps: params[:stamps], tips_cents: params[:tipsCents])
      render json: { you: player.as_entry }
    else
      render json: { error: error_code(player) }, status: :unprocessable_content
    end
  end

  private

  # Short codes the game turns into its own messages.
  def error_code(player)
    return "name_taken" if player.errors.of_kind?(:name, :taken)
    return "name_not_allowed" if player.errors.of_kind?(:name, :rude)
    return "name_invalid" if player.errors.include?(:name)

    "bad_score"
  end
end
