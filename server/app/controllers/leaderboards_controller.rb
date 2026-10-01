# GET /leaderboard: the top players, plus the caller's own row and rank when they send their token.
class LeaderboardsController < ApplicationController
  def show
    players = Player.ranked.limit(Player::TOP).each_with_index.map { |player, i| player.as_entry(i + 1) }

    render json: { players: players, you: current_player&.as_entry }
  end
end
