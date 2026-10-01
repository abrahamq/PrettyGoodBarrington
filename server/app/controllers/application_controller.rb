class ApplicationController < ActionController::API
  include ActionController::HttpAuthentication::Token::ControllerMethods

  private

  # The player whose token came in the "Authorization: Bearer <token>" header, or nil.
  def current_player
    return @current_player if defined?(@current_player)

    @current_player = authenticate_with_http_token { |token, _options| Player.find_by_token(token) }
  end
end
