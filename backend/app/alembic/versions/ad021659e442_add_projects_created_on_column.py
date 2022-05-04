"""add projects created on column

Revision ID: ad021659e442
Revises: d9ce25b49efb
Create Date: 2021-02-19 19:44:16.346456

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'ad021659e442'
down_revision = 'd9ce25b49efb'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('projects', sa.Column('created_on', sa.DateTime(timezone=True), nullable=True))
    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_column('projects', 'created_on')
    # ### end Alembic commands ###