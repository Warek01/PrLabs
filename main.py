import player_pb2

Player = player_pb2.PlayersList.Player

player = Player()
player.cls = 'Berserk'
player.email = 'test@email.com'
player.nickname = 'warek'
player.date_of_birth = '2001-06-10'
player.xp = 21

print(player.SerializeToString())
