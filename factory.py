from datetime import datetime
import re

import player_pb2
from player import Player

PBPlayer = player_pb2.PlayersList.Player
PBPlayerList = player_pb2.PlayersList


class PlayerFactory:
  def to_json(self, players: list[Player]) -> list[dict]:
    players_ls = []

    for player in players:
      player_dict = {
        "nickname": player.nickname,
        "email": player.email,
        "date_of_birth": datetime.strftime(player.date_of_birth, '%Y-%m-%d'),
        "xp": player.xp,
        "class": player.cls,
      }

      players_ls += [
        player_dict
      ]

    return players_ls

  def from_json(self, list_of_dict: list[dict]) -> list[Player]:
    players_ls = []

    for player_dict in list_of_dict:
      player = Player(
        player_dict['nickname'],
        player_dict['email'],
        player_dict['date_of_birth'],
        player_dict['xp'],
        player_dict['class']
      )

      players_ls += [player]

    return players_ls

  def from_xml(self, xml_string: str) -> list[Player]:
    all_players_ls: list[Player] = []
    all_players_str: list[str] = re.findall('<player>(?s:.*?)*?</player>', xml_string)

    for player_str in all_players_str:
      player = Player(
        re.findall('(?<=<nickname>).+?(?=</nickname>)', player_str)[0],
        re.findall('(?<=<email>).+?(?=</email>)', player_str)[0],
        re.findall('(?<=<date_of_birth>).+?(?=</date_of_birth>)', player_str)[0],
        int(re.findall('(?<=<xp>).+?(?=</xp>)', player_str)[0]),
        re.findall('(?<=<class>).+?(?=</class>)', player_str)[0],
      )

      all_players_ls += [player]

    return all_players_ls

  def to_xml(self, list_of_players: list[Player]) -> str:
    xml_string = '''<?xml version="1.0"?>
            <data>'''

    for player in list_of_players:
      xml_string += f'''
                 <player>
                    <nickname>{player.nickname}</nickname>
                    <email>{player.email}</email>
                    <date_of_birth>{datetime.strftime(player.date_of_birth, '%Y-%m-%d')}</date_of_birth>
                    <xp>{player.xp}</xp>
                    <class>{player.cls}</class>
                </player>
      '''

    xml_string += '''
                </data>
        '''

    return xml_string

  def from_protobuf(self, binary: str) -> list[Player]:
    decoded_player_list: PBPlayerList = PBPlayerList()
    decoded_player_list.ParseFromString(binary)

    players_list: list[Player] = []
    classes: tuple = ('Berserk', 'Tank', 'Paladin', 'Mage')

    for player in decoded_player_list.player:
      players_list += [Player(
        nickname=player.nickname,
        date_of_birth=player.date_of_birth,
        email=player.email,
        cls=classes[player.cls],
        xp=player.xp
      )]

    return players_list

  def to_protobuf(self, list_of_players: list[Player]) -> str:
    encoded_player_list: PBPlayerList = PBPlayerList()

    for player in list_of_players:
      encoded_player_list.player.append(PBPlayer(
        nickname=player.nickname,
        date_of_birth=datetime.strftime(player.date_of_birth, '%Y-%m-%d'),
        email=player.email,
        cls=player.cls,
        xp=player.xp
      ))

    return encoded_player_list.SerializeToString()
