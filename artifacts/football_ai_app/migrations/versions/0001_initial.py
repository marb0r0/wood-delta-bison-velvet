"""initial schema"""
from alembic import op
import sqlalchemy as sa

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    op.create_table(
        "fixtures",
        sa.Column("id", sa.String(80), primary_key=True),
        sa.Column("competition", sa.String(160), nullable=False),
        sa.Column("season", sa.String(40), nullable=True),
        sa.Column("kickoff_utc", sa.DateTime(timezone=True), nullable=True),
        sa.Column("home_team", sa.String(160), nullable=False),
        sa.Column("away_team", sa.String(160), nullable=False),
        sa.Column("home_goals", sa.Integer(), nullable=True),
        sa.Column("away_goals", sa.Integer(), nullable=True),
        sa.Column("source", sa.String(80), nullable=False, server_default="manual"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_fixtures_kickoff_utc", "fixtures", ["kickoff_utc"])
    op.create_table(
        "predictions",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("fixture_id", sa.String(80), sa.ForeignKey("fixtures.id"), nullable=False),
        sa.Column("model_version", sa.String(80), nullable=False),
        sa.Column("predicted_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("home_xg", sa.Float(), nullable=False),
        sa.Column("away_xg", sa.Float(), nullable=False),
        sa.Column("home_win", sa.Float(), nullable=False),
        sa.Column("draw", sa.Float(), nullable=False),
        sa.Column("away_win", sa.Float(), nullable=False),
        sa.Column("over_2_5", sa.Float(), nullable=False),
        sa.Column("btts_yes", sa.Float(), nullable=False),
    )

def downgrade():
    op.drop_table("predictions")
    op.drop_index("ix_fixtures_kickoff_utc", table_name="fixtures")
    op.drop_table("fixtures")
