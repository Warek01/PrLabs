from google.protobuf.internal import containers as _containers
from google.protobuf.internal import enum_type_wrapper as _enum_type_wrapper
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from typing import ClassVar, Iterable, Mapping, Optional, Union

Berserk: Class
DESCRIPTOR: _descriptor.FileDescriptor
Mage: Class
Paladin: Class
Tank: Class

class PlayersList(_message.Message):
    __slots__ = ["player"]
    class Player(_message.Message):
        __slots__ = ["cls", "date_of_birth", "email", "nickname", "xp"]
        CLS_FIELD_NUMBER: ClassVar[int]
        DATE_OF_BIRTH_FIELD_NUMBER: ClassVar[int]
        EMAIL_FIELD_NUMBER: ClassVar[int]
        NICKNAME_FIELD_NUMBER: ClassVar[int]
        XP_FIELD_NUMBER: ClassVar[int]
        cls: Class
        date_of_birth: str
        email: str
        nickname: str
        xp: int
        def __init__(self, nickname: Optional[str] = ..., email: Optional[str] = ..., date_of_birth: Optional[str] = ..., xp: Optional[int] = ..., cls: Optional[Union[Class, str]] = ...) -> None: ...
    PLAYER_FIELD_NUMBER: ClassVar[int]
    player: _containers.RepeatedCompositeFieldContainer[PlayersList.Player]
    def __init__(self, player: Optional[Iterable[Union[PlayersList.Player, Mapping]]] = ...) -> None: ...

class Class(int, metaclass=_enum_type_wrapper.EnumTypeWrapper):
    __slots__ = []
