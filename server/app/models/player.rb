# A player on the leaderboard: a display name, their best stamp count and tips, and the digest of a secret
# device token. The game keeps the token itself, and sends it to update the row; the database never sees it.
class Player < ApplicationRecord
  TOP = 10
  MAX_STAMPS = 8
  MAX_TIPS_CENTS = 100_000
  # Uppercase letters and digits, with single spaces between words (the game's name picker offers exactly these).
  NAME_FORMAT = /\A[A-Z0-9]+( [A-Z0-9]+)*\z/
  # Never allowed anywhere in a name. Short on purpose; any row can also be deleted from the Rails console.
  BLOCKED_WORDS = %w[fuck shit cunt bitch dick cock pussy slut whore nazi nigg fagg].freeze

  before_validation :tidy_name

  validates :name, length: { in: 3..10 }, format: { with: NAME_FORMAT }, uniqueness: { case_sensitive: false }
  validate :name_must_be_polite
  validates :stamps, numericality: { only_integer: true, in: 0..MAX_STAMPS }
  validates :tips_cents, numericality: { only_integer: true, in: 0..MAX_TIPS_CENTS }

  # Most stamps first, then most tips, then whoever reached that standing first.
  scope :ranked, -> { order(stamps: :desc, tips_cents: :desc, submitted_at: :asc, id: :asc) }

  # Creates a player with a new token. Returns [player, token]; token is nil when the player is not valid.
  def self.issue(name:, stamps:, tips_cents:)
    token = SecureRandom.urlsafe_base64(24)
    player = new(name: name, stamps: stamps, tips_cents: tips_cents, token_digest: digest(token), submitted_at: Time.current)

    [player, player.save ? token : nil]
  end

  def self.find_by_token(token)
    token.present? ? find_by(token_digest: digest(token)) : nil
  end

  def self.digest(token)
    Digest::SHA256.hexdigest(token)
  end

  # Keeps the higher of the stored and the new values, so a reset save never lowers a player's row.
  def record_progress(stamps:, tips_cents:)
    new_stamps = Integer(stamps, exception: false)
    new_tips = Integer(tips_cents, exception: false)
    if new_stamps.nil? || new_tips.nil?
      errors.add(new_stamps.nil? ? :stamps : :tips_cents, :not_a_number)
      return false
    end

    best_stamps = [self.stamps, new_stamps].max
    best_tips = [self.tips_cents, new_tips].max
    self.submitted_at = Time.current if best_stamps > self.stamps || best_tips > self.tips_cents
    self.stamps = best_stamps
    self.tips_cents = best_tips
    save
  end

  def rank
    ahead = Player.where(
      "stamps > :stamps OR (stamps = :stamps AND tips_cents > :tips) " \
      "OR (stamps = :stamps AND tips_cents = :tips AND (submitted_at < :at OR (submitted_at = :at AND id < :id)))",
      stamps: stamps, tips: tips_cents, at: submitted_at, id: id
    ).count

    ahead + 1
  end

  # The JSON the game reads (camelCase, like the rest of the game's code).
  def as_entry(position = rank)
    { rank: position, name: name, stamps: stamps, tipsCents: tips_cents }
  end

  private

  def tidy_name
    self.name = name.to_s.strip.squeeze(" ").upcase
  end

  def name_must_be_polite
    errors.add(:name, :rude, message: "is not allowed") if BLOCKED_WORDS.any? { |word| name.to_s.downcase.include?(word) }
  end
end
