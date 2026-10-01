require "test_helper"

class LeaderboardApiTest < ActionDispatch::IntegrationTest
  setup do
    PlayersController::RATE_LIMIT_STORE.clear
  end

  def join(name, stamps: 0, tips_cents: 0)
    post "/players", params: { name: name, stamps: stamps, tipsCents: tips_cents }, as: :json
    response.parsed_body["token"]
  end

  def bearer(token)
    { "Authorization" => "Bearer #{token}" }
  end

  # Made with the model directly: twelve POSTs would trip the rate limit.
  test "GET /leaderboard lists the top ten in order, with ranks" do
    12.times { |i| Player.issue(name: "P#{format('%02d', i)}", stamps: i % 9, tips_cents: i * 100) }

    get "/leaderboard", as: :json

    assert_response :ok
    players = response.parsed_body["players"]
    assert_equal 10, players.size
    assert_equal({ "rank" => 1, "name" => "P08", "stamps" => 8, "tipsCents" => 800 }, players.first)
    assert_equal (1..10).to_a, players.map { |p| p["rank"] }
    assert_nil response.parsed_body["you"]
  end

  test "GET /leaderboard includes your own row when you send your token" do
    token = join("ABE", stamps: 1, tips_cents: 250)

    get "/leaderboard", headers: bearer(token), as: :json

    assert_equal({ "rank" => 1, "name" => "ABE", "stamps" => 1, "tipsCents" => 250 }, response.parsed_body["you"])
  end

  test "POST /players creates a player and returns the token once" do
    post "/players", params: { name: "abe", stamps: 2, tipsCents: 1250 }, as: :json

    assert_response :created
    assert response.parsed_body["token"].present?
    assert_equal({ "rank" => 1, "name" => "ABE", "stamps" => 2, "tipsCents" => 1250 }, response.parsed_body["you"])
  end

  test "POST /players explains a bad or taken name with an error code" do
    join("ABE")

    post "/players", params: { name: "ABE", stamps: 0, tipsCents: 0 }, as: :json
    assert_response :unprocessable_content
    assert_equal "name_taken", response.parsed_body["error"]

    post "/players", params: { name: "A!", stamps: 0, tipsCents: 0 }, as: :json
    assert_equal "name_invalid", response.parsed_body["error"]

    post "/players", params: { name: "SHITHEAD", stamps: 0, tipsCents: 0 }, as: :json
    assert_equal "name_not_allowed", response.parsed_body["error"]

    post "/players", params: { name: "BOB", stamps: 99, tipsCents: 0 }, as: :json
    assert_equal "bad_score", response.parsed_body["error"]
  end

  test "PATCH /players/me updates your row, and never lowers it" do
    token = join("ABE", stamps: 2, tips_cents: 500)

    patch "/players/me", params: { stamps: 3, tipsCents: 100 }, headers: bearer(token), as: :json

    assert_response :ok
    assert_equal({ "rank" => 1, "name" => "ABE", "stamps" => 3, "tipsCents" => 500 }, response.parsed_body["you"])
  end

  test "PATCH /players/me needs a valid token" do
    patch "/players/me", params: { stamps: 3, tipsCents: 0 }, as: :json
    assert_response :unauthorized

    patch "/players/me", params: { stamps: 3, tipsCents: 0 }, headers: bearer("made-up"), as: :json
    assert_response :unauthorized
    assert_equal "unknown_player", response.parsed_body["error"]
  end

  test "limits each address to 10 writes a minute" do
    10.times { |i| join("RATE#{i}") }

    post "/players", params: { name: "RATEX", stamps: 0, tipsCents: 0 }, as: :json

    assert_response :too_many_requests
  end

  test "lets the game's dev page call the API, and nobody else" do
    options "/players", headers: {
      "Origin" => "http://192.168.18.44:8080",
      "Access-Control-Request-Method" => "POST",
      "Access-Control-Request-Headers" => "content-type, authorization"
    }
    assert_equal "http://192.168.18.44:8080", response.headers["Access-Control-Allow-Origin"]

    options "/players", headers: { "Origin" => "https://example.com", "Access-Control-Request-Method" => "POST" }
    assert_nil response.headers["Access-Control-Allow-Origin"]
  end
end
