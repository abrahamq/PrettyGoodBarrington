require "test_helper"

class PlayerTest < ActiveSupport::TestCase
  def make(name, stamps: 0, tips_cents: 0, submitted_at: Time.current)
    player, = Player.issue(name: name, stamps: stamps, tips_cents: tips_cents)
    player.update_column(:submitted_at, submitted_at)
    player
  end

  test "tidies names: trims, squeezes spaces, and uppercases" do
    player, token = Player.issue(name: "  abe   q ", stamps: 0, tips_cents: 0)

    assert token
    assert_equal "ABE Q", player.name
  end

  test "rejects names that are too short, too long, or use other characters" do
    ["AB", "ABCDEFGHIJK", "ABE!", "ÅBE"].each do |name|
      player, token = Player.issue(name: name, stamps: 0, tips_cents: 0)

      assert_nil token, name
      assert player.errors.of_kind?(:name, :invalid) || player.errors.of_kind?(:name, :too_short) ||
             player.errors.of_kind?(:name, :too_long), name
    end
  end

  test "rejects rude names" do
    player, token = Player.issue(name: "SHITHEAD", stamps: 0, tips_cents: 0)

    assert_nil token
    assert player.errors.of_kind?(:name, :rude)
  end

  test "rejects a name that is already taken, in any case" do
    make("ABE")
    player, token = Player.issue(name: "abe", stamps: 0, tips_cents: 0)

    assert_nil token
    assert player.errors.of_kind?(:name, :taken)
  end

  test "keeps stamps between 0 and 8 and tips between 0 and $1000" do
    _, too_many_stamps = Player.issue(name: "AAA", stamps: 9, tips_cents: 0)
    _, too_many_tips = Player.issue(name: "BBB", stamps: 0, tips_cents: 100_001)
    _, negative = Player.issue(name: "CCC", stamps: -1, tips_cents: 0)

    assert_nil too_many_stamps
    assert_nil too_many_tips
    assert_nil negative
  end

  test "stores only a digest of the token, and finds the player by the token" do
    player, token = Player.issue(name: "ABE", stamps: 1, tips_cents: 0)

    assert_not_equal token, player.token_digest
    assert_equal player, Player.find_by_token(token)
    assert_nil Player.find_by_token("not-a-token")
    assert_nil Player.find_by_token(nil)
  end

  test "ranks by stamps, then tips, then whoever got there first" do
    early = make("EARLY", stamps: 2, tips_cents: 500, submitted_at: 2.days.ago)
    late = make("LATE", stamps: 2, tips_cents: 500, submitted_at: 1.day.ago)
    rich = make("RICH", stamps: 2, tips_cents: 900)
    leader = make("LEADER", stamps: 3, tips_cents: 0)

    assert_equal [leader, rich, early, late], Player.ranked.to_a
    assert_equal [1, 2, 3, 4], [leader, rich, early, late].map(&:rank)
  end

  test "progress only goes up, and the time changes only when it does" do
    player = make("ABE", stamps: 2, tips_cents: 500, submitted_at: 2.days.ago)
    before = player.submitted_at

    assert player.record_progress(stamps: 1, tips_cents: 100)
    assert_equal [2, 500], [player.stamps, player.tips_cents]
    assert_equal before, player.reload.submitted_at

    assert player.record_progress(stamps: 3, tips_cents: 100)
    assert_equal [3, 500], [player.stamps, player.tips_cents]
    assert_operator player.reload.submitted_at, :>, before
  end

  test "refuses progress that is not a number" do
    player = make("ABE")

    assert_not player.record_progress(stamps: nil, tips_cents: 0)
    assert player.errors.of_kind?(:stamps, :not_a_number)
  end
end
